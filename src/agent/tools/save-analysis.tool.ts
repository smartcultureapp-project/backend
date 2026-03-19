import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { PrismaService } from '@/prisma/prisma.service';

const AnalysisSchema = z.object({
  talents:                     z.array(z.string()),
  tech_stack:                  z.array(z.string()),
  culture_keywords:            z.array(z.string()),
  interview_style:             z.array(z.string()),
  recommended_question_angles: z.array(z.string()),
  interview_avoid:             z.array(z.string()).describe('면접에서 하면 안 되는 것들 (실제 후기 기반)'),
  interview_success_tips:      z.array(z.string()).describe('좋은 평가/합격 받은 후기에서 나온 팁'),
  company_summary:             z.string(),
  job_role_summary:            z.string(),
  search_sources:              z.array(z.string()),
  confidence_score:            z.number().min(0)
    .max(100),
});

export function createSaveAnalysisTool(
  prismaService: PrismaService,
  sessionId: string,
  companyName: string,
  jobRole: string,
  additionalInfo?: string,
) {
  return createTool({
    id:          'save_analysis',
    description: '수집된 회사 분석 결과를 구조화하여 DB에 저장한다. 모든 조사 완료 후 딱 한 번만 호출한다.',
    inputSchema: AnalysisSchema,
    execute:     async ({ context }) => {
      const analysisId = nanoid();

      try {
        await prismaService.companyAnalysis.create({ data: {
          id:                        analysisId,
          sessionId,
          companyName,
          jobRole,
          rawAdditionalInfo:         additionalInfo ?? null,
          talents:                   JSON.stringify(context.talents),
          techStack:                 JSON.stringify(context.tech_stack),
          cultureKeywords:           JSON.stringify(context.culture_keywords),
          interviewStyle:            JSON.stringify(context.interview_style),
          recommendedQuestionAngles: JSON.stringify(context.recommended_question_angles),
          interviewAvoid:            JSON.stringify(context.interview_avoid),
          interviewSuccessTips:      JSON.stringify(context.interview_success_tips),
          searchSources:             JSON.stringify(context.search_sources),
          companySummary:            context.company_summary,
          jobRoleSummary:            context.job_role_summary,
          confidenceScore:           context.confidence_score,
        } });

        await prismaService.session.update({
          where: { id: sessionId },
          data:  {
            companyAnalysisId: analysisId,
            phase:             'READY',
          },
        });

        return {
          success: true, analysisId,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        return {
          success: false, analysisId, error: message,
        };
      }
    },
  });
}
