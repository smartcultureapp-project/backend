import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { PrismaService } from '@/prisma/prisma.service';

const ExperienceSchema = z.object({
  company:    z.string().describe('회사명'),
  role:       z.string().describe('직함'),
  period:     z.string().describe('재직 기간'),
  highlights: z.array(z.string()).describe('핵심 성과 1~3줄'),
});

const ProfileSchema = z.object({
  name: z.string().optional()
    .describe('이름'),
  title: z.string().optional()
    .describe('직함/직군'),
  yearsOfExperience: z.number().optional()
    .describe('총 경력 연수'),
  education: z.string().optional()
    .describe('최종 학력'),
});

const ResumeSummarySchema = z.object({
  profile:        ProfileSchema,
  skills:         z.array(z.string()).describe('기술/역량 목록'),
  experiences:    z.array(ExperienceSchema).describe('주요 경력'),
  strengths:      z.array(z.string()).describe('핵심 강점 3~5개'),
  weaknesses:     z.array(z.string()).describe('보완점 2~3개'),
  interviewFocus: z.array(z.string()).describe('면접 집중 포인트 3~5개'),
});

export function createSaveResumeSummaryTool(prismaService: PrismaService,
  resumeAnalysisId: string) {
  return createTool({
    id:          'save_resume_summary',
    description: '이력서 분석 결과를 구조화된 JSON으로 DB에 저장한다. 분석 완료 후 딱 한 번 호출한다.',
    inputSchema: ResumeSummarySchema,
    execute:     async ({ context }) => {
      try {
        await prismaService.resumeAnalysis.update({
          where: { id: resumeAnalysisId },
          data:  { summary: {
            profile:        context.profile,
            skills:         context.skills,
            experiences:    context.experiences,
            strengths:      context.strengths,
            weaknesses:     context.weaknesses,
            interviewFocus: context.interviewFocus,
          } },
        });

        return {
          success: true, resumeAnalysisId,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        return {
          success: false, resumeAnalysisId, error: message,
        };
      }
    },
  });
}
