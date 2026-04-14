import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { PrismaService } from '@/prisma/prisma.service';

const SearchSourceSchema = z.object({
  url:   z.string().describe('출처 URL'),
  title: z.string().describe('출처 제목'),
  type:  z.string().describe('출처 유형: 공식/블로그/커뮤니티/뉴스'),
});

const AnalysisSchema = z.object({
  talents:                     z.array(z.string()),
  tech_stack:                  z.array(z.string()),
  culture_keywords:            z.array(z.string()),
  interview_style:             z.array(z.string()),
  recommended_question_angles: z.array(z.string()),
  interview_avoid:             z.array(z.string())
    .describe('면접에서 하면 안 되는 것들 (실제 후기 기반)'),
  interview_success_tips: z.array(z.string())
    .describe('좋은 평가/합격 받은 후기에서 나온 팁'),
  interview_tips: z.array(z.string())
    .describe('문장형 면접 꿀팁 (예: "토스에서는 과제 코드의 설계 의도를 물어보므로...")'),
  actual_questions: z.array(z.string())
    .describe('실제 면접에서 나온 질문 (후기에서 추출)'),
  interview_process: z.string()
    .describe('면접 전체 프로세스 설명 (서류→과제→1차→2차 등)'),
  company_summary:  z.string(),
  job_role_summary: z.string(),
  search_sources:   z.array(SearchSourceSchema)
    .describe('조사에 사용한 출처 목록'),
  confidence_score: z.number().min(0)
    .max(100),
  company_website: z.string().url()
    .optional(),
  company_industry:    z.string().optional(),
  company_description: z.string().optional(),
  company_logoUrl:     z.string().url()
    .optional(),
  company_careerPage: z.string().url()
    .optional(),
  company_techBlog: z.string().url()
    .optional(),
  company_headquarters:  z.string().optional(),
  company_nameEn:        z.string().optional(),
  company_employeeCount: z.string().optional(),
  company_foundedYear:   z
    .number()
    .int()
    .optional(),
  company_stockTicker: z.string().optional(),
});

export function createSaveAnalysisTool(
  prismaService: PrismaService,
  sessionId: string,
  companyName: string,
  jobRole: string,
  additionalInfo?: string,
  companyId?: string,
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
          companyId:                 companyId ?? null,
          companyName,
          jobRole,
          rawAdditionalInfo:         additionalInfo ?? null,
          talents:                   context.talents,
          techStack:                 context.tech_stack,
          cultureKeywords:           context.culture_keywords,
          interviewStyle:            context.interview_style,
          recommendedQuestionAngles: context.recommended_question_angles,
          interviewAvoid:            context.interview_avoid,
          interviewSuccessTips:      context.interview_success_tips,
          interviewTips:             context.interview_tips,
          actualQuestions:           context.actual_questions,
          interviewProcess:          context.interview_process,
          searchSources:             context.search_sources,
          companySummary:            context.company_summary,
          jobRoleSummary:            context.job_role_summary,
          confidenceScore:           context.confidence_score,
          researchedAt:              new Date(),
        } });

        await prismaService.session.update({
          where: { id: sessionId },
          data:  {
            companyAnalysisId: analysisId,
            phase:             'READY',
          },
        });

        if (companyId && (context.company_website || context.company_industry || context.company_description ||
          context.company_careerPage || context.company_techBlog || context.company_headquarters ||
          context.company_nameEn || context.company_employeeCount != null ||
          context.company_foundedYear != null || context.company_stockTicker)) {
          // logoUrl: Google favicon 사용 (Clearbit 접속 불가 대비)
          let logoUrl: string | undefined;

          if (context.company_website) {
            try {
              const host = new URL(context.company_website).hostname;

              logoUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
            } catch {}
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prismaService as any).company.update({
            where: { id: companyId },
            data:  {
              ...context.company_website && { website: context.company_website },
              ...context.company_industry && { industry: context.company_industry },
              ...context.company_description && { description: context.company_description },
              ...logoUrl && { logoUrl },
              ...context.company_careerPage && { careerPage: context.company_careerPage },
              ...context.company_techBlog && { techBlog: context.company_techBlog },
              ...context.company_headquarters && { headquarters: context.company_headquarters },
              ...context.company_nameEn && { nameEn: context.company_nameEn },
              ...(context.company_employeeCount != null && context.company_employeeCount !== '') && { employeeCount: context.company_employeeCount },
              ...context.company_foundedYear != null && { foundedYear: context.company_foundedYear },
              ...context.company_stockTicker && { stockTicker: context.company_stockTicker },
            },
          });
        }

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
