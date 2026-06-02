import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { generateText, tool, type LanguageModel } from 'ai-v5';
import { z } from 'zod';
import { getAgentModel } from '../agent/model-provider';
import type { CompanyAnalysis, Session } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';

interface LoadedInterviewContext {
  session:           Session;
  companyAnalysis:   CompanyAnalysis | null;
  analysisSnippet:   string;
  resumeSnippet:     string;
  resumeSummaryText: string;
  evaluationSnippet: string;
}

const QuestionSchema = z.object({ question: z.string().describe('면접관이 물을 한 가지 질문 (한국어)') });

const EvaluationSchema = z.object({
  score: z.number().int()
    .min(1)
    .max(5)
    .describe('1~5 점수'),
  feedbackGood:    z.string().describe('답변의 좋은 점'),
  feedbackImprove: z.string().describe('보완하면 좋을 점'),
  betterAnswer:    z.string().describe('더 나은 답변 예시 (한국어)'),
});

const MAX_CONTEXT = 14_000;
const MAX_RESUME  = 12_000;

/**
 * ai-v5 `generateObject` 는 항상 `responseFormat: json` 으로 호출하는데, OpenRouter→Anthropic
 * 은 json_schema response_format 을 무시하고 평문을 반환 → 파싱 실패한다.
 * 그래서 강제 tool 콜(`toolChoice: respond`)로 구조화 출력을 받아 그 input 을 결과로 쓴다.
 * 스키마 제네릭 추론(z3|z4 → TS2589)도 여기서 한 번만 끊는다.
 */
async function generateStructured<T>(schema: z.ZodType<T>, prompt: string): Promise<T> {
  const { toolCalls } = await generateText({
    model: getAgentModel() as LanguageModel,
    tools: {
      respond: tool({
        description: '결과를 구조화된 형식으로 반환한다',
        // z3|z4 동시 추론 차단 (런타임 동일) — 결과 타입은 schema<T> 로 보장
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: schema as any,
      }),
    },
    toolChoice: { type: 'tool', toolName: 'respond' },
    prompt,
  });

  const call = toolCalls[0];

  if (!call) {
    throw new Error('구조화 출력 생성 실패: 모델이 tool 을 호출하지 않았습니다.');
  }

  return call.input as T;
}

@Injectable()
export class MockInterviewService {
  private readonly logger = new Logger(MockInterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async nextQuestion(sessionId: string, userId: string) {
    const ctx = await this.loadContext(sessionId, userId);
    const existing = await this.prisma.interviewTurn.findMany({
      where:   { sessionId },
      orderBy: [{ turnIndex: 'asc' }, { createdAt: 'asc' }],
    });

    const pending = existing.find(t => t.question && !t.answer);

    if (pending) {
      throw new BadRequestException('이전 질문에 답변을 제출한 뒤 다음 질문을 요청하세요.');
    }

    const nextIndex = existing.reduce((m, t) => Math.max(m, t.turnIndex ?? 0), -1) + 1;
    const asked     = existing.map(t => t.question).filter(Boolean) as string[];

    if (process.env.MOCK_ANALYSIS === 'true') {
      const question = `[모의 ${nextIndex + 1}] ${ctx.session.companyName} ${ctx.session.jobRole} 직무에 지원한 이유를 2~3문장으로 말해보세요.`;

      const turn = await this.prisma.interviewTurn.create({ data: {
        sessionId,
        question,
        turnIndex: nextIndex,
      } });

      await this.prisma.session.update({
        where: { id: sessionId },
        data:  { phase: 'INTERVIEWING' },
      });

      return {
        turnId: turn.id, question: turn.question, turnIndex: turn.turnIndex,
      };
    }

    const prompt = this.buildQuestionPrompt(ctx, asked, nextIndex);

    const object = await generateStructured(QuestionSchema, prompt);

    const turn = await this.prisma.interviewTurn.create({ data: {
      sessionId,
      question:  object.question,
      turnIndex: nextIndex,
    } });

    await this.prisma.session.update({
      where: { id: sessionId },
      data:  { phase: 'INTERVIEWING' },
    });

    this.logger.log(`모의 면접 질문 생성 session=${sessionId} turn=${turn.id}`);

    return {
      turnId: turn.id, question: turn.question, turnIndex: turn.turnIndex,
    };
  }

  async submitAnswer(sessionId: string,
    userId: string,
    dto: SubmitInterviewAnswerDto) {
    const ctx = await this.loadContext(sessionId, userId);

    const pending = await this.prisma.interviewTurn.findFirst({
      where: {
        sessionId,
        question: { not: null },
        answer:   null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending?.question) {
      throw new BadRequestException('먼저 POST .../interview/next-question 으로 질문을 받으세요.');
    }

    if (process.env.MOCK_ANALYSIS === 'true') {
      const updated = await this.prisma.interviewTurn.update({
        where: { id: pending.id },
        data:  {
          answer:          dto.answer,
          score:           3,
          feedbackGood:    '모의 모드: 구체적으로 말한 점이 좋습니다.',
          feedbackImprove: '실제 서비스에서는 회사·직무에 맞춘 피드백이 생성됩니다.',
          betterAnswer:    '지원 동기 + 본인 경험을 회사 맥락과 연결해 말하는 예시 답변입니다.',
        },
      });

      return {
        turnId:          updated.id,
        score:           updated.score,
        feedbackGood:    updated.feedbackGood,
        feedbackImprove: updated.feedbackImprove,
        betterAnswer:    updated.betterAnswer,
      };
    }

    const prompt = this.buildEvaluationPrompt(ctx, pending.question, dto.answer);

    const object = await generateStructured(EvaluationSchema, prompt);

    const updated = await this.prisma.interviewTurn.update({
      where: { id: pending.id },
      data:  {
        answer:          dto.answer,
        score:           object.score,
        feedbackGood:    object.feedbackGood,
        feedbackImprove: object.feedbackImprove,
        betterAnswer:    object.betterAnswer,
      },
    });

    this.logger.log(`모의 면접 답변 평가 session=${sessionId} turn=${updated.id}`);

    return {
      turnId:          updated.id,
      score:           updated.score,
      feedbackGood:    updated.feedbackGood,
      feedbackImprove: updated.feedbackImprove,
      betterAnswer:    updated.betterAnswer,
    };
  }

  private async loadContext(sessionId: string, userId: string): Promise<LoadedInterviewContext> {
    const session = await this.prisma.session.findFirst({ where: {
      id: sessionId, userId,
    } });

    if (!session) {
      throw new NotFoundException(`Session(${sessionId})를 찾을 수 없습니다`);
    }

    let companyAnalysis = session.companyAnalysisId
      ? await this.prisma.companyAnalysis.findUnique({ where: { id: session.companyAnalysisId } })
      : null;

    if (!companyAnalysis) {
      companyAnalysis = await this.prisma.companyAnalysis.findFirst({ where: { sessionId } });
    }

    let resumeSnippet = '';
    let resumeSummaryText = '';

    if (session.resumeAnalysisId) {
      const resume = await this.prisma.resumeAnalysis.findUnique({ where: { id: session.resumeAnalysisId } });

      if (resume) {
        resumeSnippet = resume.rawText.slice(0, MAX_RESUME);
        resumeSummaryText = resume.summary
          ? JSON.stringify(resume.summary).slice(0, MAX_CONTEXT)
          : '';
      }
    }

    let evaluationSnippet = '';

    if (companyAnalysis?.id) {
      const tmpl = await this.prisma.evaluationTemplate.findFirst({ where: { companyAnalysisId: companyAnalysis.id } });

      if (tmpl?.template) {
        evaluationSnippet = JSON.stringify(tmpl.template).slice(0, MAX_CONTEXT);
      }
    }

    const analysisSnippet = companyAnalysis
      ? [
        `회사 요약: ${companyAnalysis.companySummary}`,
        `직무 요약: ${companyAnalysis.jobRoleSummary}`,
        `인재상(키워드): ${JSON.stringify(companyAnalysis.talents)}`,
        `기술스택: ${JSON.stringify(companyAnalysis.techStack)}`,
        `실제 질문 예시: ${JSON.stringify(companyAnalysis.actualQuestions)}`,
      ].join('\n')
      : '(회사 분석 없음 — 회사명·직군만으로 질문하세요.)';

    return {
      session,
      companyAnalysis,
      analysisSnippet: analysisSnippet.slice(0, MAX_CONTEXT),
      resumeSnippet,
      resumeSummaryText,
      evaluationSnippet,
    };
  }

  private buildQuestionPrompt(ctx: LoadedInterviewContext,
    alreadyAsked: string[],
    turnIndex: number) {
    const askedBlock = alreadyAsked.length
      ? `이미 나온 질문 (비슷하게 반복하지 마세요):\n${alreadyAsked.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '(아직 질문 없음)';

    return `당신은 한국어 기술/직무 면접관입니다. 아래 지원 맥락을 바탕으로 **하나의 질문만** 만드세요.

## 지원 정보
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}
- 턴 번호(0부터): ${turnIndex}

## 회사 분석 요약
${ctx.analysisSnippet}

## 평가 템플릿 (참고)
${ctx.evaluationSnippet || '(없음)'}

## 지원자 이력서 요약(JSON)
${ctx.resumeSummaryText || '(없음)'}

## 지원자 이력서 일부
${ctx.resumeSnippet || '(없음)'}

## ${askedBlock}

질문은 한 문장 또는 두 문장 이내로, 직무·회사·이력서와 연결되게 하세요.`;
  }

  private buildEvaluationPrompt(ctx: LoadedInterviewContext,
    question: string,
    answer: string) {
    return `당신은 한국어 면접 코치입니다. 아래 질문에 대한 지원자 답변을 1~5점으로 평가하고 피드백을 주세요.

## 맥락
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}

## 회사/직무 요약
${ctx.analysisSnippet.slice(0, 6_000)}

## 질문
${question}

## 지원자 답변
${answer}

점수 기준: 1=매우 부족, 3=보통, 5=매우 좋음. 한국어로 작성하세요.`;
  }
}
