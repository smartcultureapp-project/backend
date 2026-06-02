import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { generateText, type LanguageModel, tool } from 'ai-v5';
import { z } from 'zod';
import { getAgentModel } from '../agent/model-provider';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateResumeDto } from './dto/create-resume.dto';

// 이력서 요약 구조 (프론트 ResumeSummary 타입과 동일)
const ResumeSummarySchema = z.object({
  profile: z.object({
    name:              z.string().optional(),
    title:             z.string().optional(),
    yearsOfExperience: z.number().optional(),
    education:         z.string().optional(),
  }),
  skills:      z.array(z.string()),
  experiences: z.array(z.object({
    company:    z.string(),
    role:       z.string(),
    period:     z.string(),
    highlights: z.array(z.string()),
  })),
  strengths:      z.array(z.string()),
  weaknesses:     z.array(z.string()),
  interviewFocus: z.array(z.string()),
});

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateResumeDto) {
    const row = await this.prisma.resumeAnalysis.create({ data: {
      userId,
      rawText: dto.rawText,
    } });
    const { id } = row;

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

        // OpenRouter→Anthropic 은 json_schema response_format 미지원 → 강제 tool 콜로 구조화 출력
        const { toolCalls } = await generateText({
          model: getAgentModel() as LanguageModel,
          tools: { saveResumeSummary: tool({
            description: '분석한 이력서 요약을 구조화해 반환한다',
            // z3|z4 동시 추론(TS2589) 회피
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputSchema: ResumeSummarySchema as any,
          }) },
          toolChoice: {
            type: 'tool', toolName: 'saveResumeSummary',
          },
          prompt: `다음 이력서/자기소개서를 분석해 구조화 요약을 만들어라. 이력서에 명시된 정보만 사용하고, 한국어로 작성한다.\n\n---\n${rawText}\n---`,
        });

        const object = toolCalls[0]?.input;

        if (!object) {
          throw new Error('이력서 요약 생성 실패: 모델이 tool 을 호출하지 않았습니다.');
        }

        await this.prisma.resumeAnalysis.update({
          where: { id: resumeAnalysisId },
          data:  { summary: object },
        });

        this.logger.log(`이력서 요약 저장 완료: ${resumeAnalysisId}`);
      } catch (err) {
        this.logger.error(`이력서 분석 실패 (${resumeAnalysisId}):`, err instanceof Error ? err.message : err);
      }
    })();
  }
}
