import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { createResumeAnalysisAgent } from '../agent/resume-analysis.agent';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateResumeDto } from './dto/create-resume.dto';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateResumeDto) {
    const id = nanoid();

    await this.prisma.resumeAnalysis.create({ data: {
      id,
      userId,
      rawText: dto.rawText,
    } });

    if (dto.sessionId) {
      const session = await this.prisma.session.findFirst({ where: {
        id: dto.sessionId, userId,
      } });

      if (!session) {
        throw new NotFoundException(`Session(${dto.sessionId})를 찾을 수 없습니다`);
      }

      await this.prisma.session.update({
        where: { id: dto.sessionId },
        data:  { resumeAnalysisId: id },
      });
    }

    this.analyzeInBackground(id, dto.rawText);

    return this.prisma.resumeAnalysis.findUniqueOrThrow({ where: { id } });
  }

  async findAllForUser(userId: string) {
    return this.prisma.resumeAnalysis.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneForUser(id: string, userId: string) {
    const row = await this.prisma.resumeAnalysis.findFirst({ where: {
      id, userId,
    } });

    if (!row) {
      throw new NotFoundException(`ResumeAnalysis(${id})를 찾을 수 없습니다`);
    }

    return row;
  }

  private analyzeInBackground(resumeAnalysisId: string, rawText: string) {
    const isMock = process.env.MOCK_ANALYSIS === 'true';

    if (isMock) {
      this.prisma.resumeAnalysis.update({
        where: { id: resumeAnalysisId },
        data:  { summary: {
          profile: {
            name: '홍길동', title: '개발자', yearsOfExperience: 3, education: '한국대 컴공',
          },
          skills: [
            'TypeScript', 'React', 'Node.js',
          ],
          experiences: [
            {
              company: 'Mock Corp', role: '개발자', period: '2023~2025', highlights: ['모의 데이터입니다'],
            },
          ],
          strengths:      ['빠른 학습', '협업'],
          weaknesses:     ['경력 짧음'],
          interviewFocus: ['프로젝트 경험 질문', '기술 깊이'],
        } },
      })
        .then(() => this.logger.log(`[MOCK] 이력서 요약 저장 완료: ${resumeAnalysisId}`))
        .catch(err => this.logger.error(`[MOCK] 이력서 요약 실패: ${err}`));

      return;
    }

    (async () => {
      try {
        this.logger.log(`이력서 분석 시작: ${resumeAnalysisId}`);

        const agent = createResumeAnalysisAgent(this.prisma, resumeAnalysisId);
        await agent.generate(`아래 이력서/자기소개서 텍스트를 분석하여 save_resume_summary 툴로 저장하세요.\n\n---\n${rawText}\n---`,
          { maxSteps: 5 });

        this.logger.log(`이력서 분석 완료: ${resumeAnalysisId}`);
      } catch (err) {
        this.logger.error(`이력서 분석 실패 (${resumeAnalysisId}):`, err instanceof Error ? err.message : err);
      }
    })();
  }
}
