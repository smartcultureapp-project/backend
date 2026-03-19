import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { PrismaService } from '@/prisma/prisma.service';

const SampleQuestionSchema = z.object({
  question:          z.string().describe('면접 질문'),
  intent:            z.string().describe('이 질문으로 보려는 역량'),
  goodAnswerExample: z.string().describe('좋은 답변 예시'),
  badAnswerExample:  z.string().describe('나쁜 답변 예시'),
});

const CriterionSchema = z.object({
  name:        z.string().describe('평가 항목명'),
  description: z.string().describe('이 항목이 무엇을 평가하는지'),
  type:        z.enum([
    'score', 'descriptive', 'hybrid',
  ]).describe('score: 점수제, descriptive: 서술형, hybrid: 점수+서술'),
  maxScore: z.number().optional()
    .describe('점수제/hybrid일 때 만점 (보통 5)'),
  rubric: z.record(z.string(), z.string()).optional()
    .describe('점수별 설명. 예: {"1":"기본 부족","3":"실무 수준","5":"전문가"}'),
  modelAnswer: z.string().optional()
    .describe('서술형/hybrid일 때 모범 답안 또는 이상적 답변 방향'),
  evaluationGuide: z.string()
    .describe('면접관용 평가 가이드 (무엇을 관찰해야 하는지)'),
  sampleQuestions: z.array(SampleQuestionSchema)
    .describe('이 항목 관련 질문 1~3개'),
});

const SectionSchema = z.object({
  name:     z.string().describe('섹션명 (예: 직무 기술 역량)'),
  weight:   z.number().describe('가중치 (%, 합계 100)'),
  criteria: z.array(CriterionSchema).describe('이 섹션의 평가 항목들'),
});

const StageSchema = z.object({
  name:        z.string().describe('면접 단계명 (예: 1차 기술 면접)'),
  description: z.string().describe('이 단계에서 주로 평가하는 내용'),
  sections:    z.array(SectionSchema).describe('평가 섹션들'),
});

const EvaluationTemplateSchema = z.object({ stages: z.array(StageSchema)
  .default([])
  .describe('면접 단계별 평가 템플릿 (1차, 2차 등)') });

export function createSaveEvaluationTemplateTool(prismaService: PrismaService,
  sessionId: string,
  companyName: string,
  jobRole: string) {
  return createTool({
    id:          'save_evaluation_template',
    description: '면접 평가서 템플릿을 생성하여 DB에 저장한다. save_analysis 호출 후 반드시 한 번 호출한다.',
    inputSchema: EvaluationTemplateSchema,
    execute:     async ({ context }) => {
      if (!context.stages || context.stages.length === 0) {
        return {
          success: false, templateId: '', error: 'stages 배열이 비어 있습니다',
        };
      }

      const templateId = nanoid();

      try {
        const analysis = await prismaService.companyAnalysis.findFirst({
          where:  { sessionId },
          select: { id: true },
        });

        await prismaService.evaluationTemplate.create({ data: {
          id:                templateId,
          companyAnalysisId: analysis?.id ?? sessionId,
          companyName,
          jobRole,
          template:          JSON.stringify(context),
        } });

        return {
          success: true, templateId,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        return {
          success: false, templateId, error: message,
        };
      }
    },
  });
}
