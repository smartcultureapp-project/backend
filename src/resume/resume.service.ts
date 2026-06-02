import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { generateStructured } from '../agent/generate-structured';
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

/** 저장된 summary 가 정상 구조(객체 + profile)인지 — 깨진 문자열/누락 판별 */
function isValidSummary(summary: unknown): boolean {
  return (
    !!summary &&
    typeof summary === 'object' &&
    'profile' in (summary as Record<string, unknown>)
  );
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // fileData(base64)는 용량이 커서 일반 조회에선 제외하고, 전용 엔드포인트로만 내려준다.
  private static readonly OMIT_FILE = { fileData: true } as const;

  async create(userId: string, dto: CreateResumeDto) {
    const row = await this.prisma.resumeAnalysis.create({ data: {
      userId,
      rawText:  dto.rawText,
      fileName: dto.fileName ?? null,
      fileType: dto.fileType ?? null,
      fileData: dto.fileData ?? null,
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
        // 새 이력서가 붙으면 기존 맞춤 예상 질문 캐시를 비워 재생성되게 한다
        data:  {
          resumeAnalysisId: id, expectedQuestions: null,
        },
      });
    }

    this.analyzeInBackground(id, dto.rawText);

    return this.prisma.resumeAnalysis.findUniqueOrThrow({
      where: { id }, omit: ResumeService.OMIT_FILE,
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.resumeAnalysis.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      omit:    ResumeService.OMIT_FILE,
    });
  }

  async findOneForUser(id: string, userId: string) {
    const row = await this.prisma.resumeAnalysis.findFirst({
      where: {
        id, userId,
      },
      omit: ResumeService.OMIT_FILE,
    });

    if (!row) {
      throw new NotFoundException(`ResumeAnalysis(${id})를 찾을 수 없습니다`);
    }

    return row;
  }

  /** 원본 파일(base64) 단건 — 전용 다운로드 엔드포인트용 */
  async getFile(id: string, userId: string) {
    const row = await this.prisma.resumeAnalysis.findFirst({
      where: {
        id, userId,
      },
      select: {
        fileName: true, fileType: true, fileData: true,
      },
    });

    if (!row?.fileData) {
      throw new NotFoundException('저장된 원본 파일이 없습니다.');
    }

    return row;
  }

  /** 요약이 비었거나 깨진(과거 XML 누출로 문자열 저장된) 이력서의 재분석을 트리거한다. */
  async reanalyze(id: string, userId: string) {
    const row = await this.findOneForUser(id, userId);

    if (!isValidSummary(row.summary)) {
      this.analyzeInBackground(row.id, row.rawText);
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

        // 재시도+정화+Zod 검증으로 견고화된 구조화 출력 (claude XML 누출 대비)
        const summary = await generateStructured(ResumeSummarySchema,
          `다음 이력서/자기소개서를 분석해 구조화 요약을 만들어라. 이력서에 명시된 정보만 사용하고, 한국어로 작성한다.\n\n---\n${rawText}\n---`);

        await this.prisma.resumeAnalysis.update({
          where: { id: resumeAnalysisId },
          data:  { summary },
        });

        this.logger.log(`이력서 요약 저장 완료: ${resumeAnalysisId}`);
      } catch (err) {
        this.logger.error(`이력서 분석 실패 (${resumeAnalysisId}):`, err instanceof Error ? err.message : err);
      }
    })();
  }
}
