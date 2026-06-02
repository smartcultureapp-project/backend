import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { generateStructured } from '../agent/generate-structured';
import type { CompanyAnalysis, Session } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';
import {
  INTERVIEWER_IDS,
  interviewerName,
  panelRoster,
  QUESTION_TYPES,
} from './interview-panel';

interface LoadedInterviewContext {
  session:           Session;
  companyAnalysis:   CompanyAnalysis | null;
  analysisSnippet:   string;
  resumeSnippet:     string;
  resumeSummaryText: string;
  evaluationSnippet: string;
}

// 3단계: 면접관 패널이 내부 토론 후 다음 질문을 정한다(단일 구조화 호출로 효율화).
const PanelQuestionSchema = z.object({
  discussion: z.array(z.object({
    interviewerId: z.string().describe("발언한 면접관 id: 'lead'|'tech'|'hr'"),
    comment:       z.string().describe('지원자에게 보이지 않는 내부 코멘트 (한국어)'),
  })).describe('다음 질문을 정하기 위한 면접관들의 짧은 내부 토론 (2~3개 발언)'),
  interviewerId: z.string().describe("이번 질문을 던질 면접관 id: 'lead'|'tech'|'hr'"),
  questionType:  z.string().describe("질문 유형: 'intro'|'technical'|'behavioral'|'culture'"),
  question:      z.string().describe('지원자에게 물을 한 문장 질문 (한국어)'),
});

/** 답변마다 평가하는 5개 역량 축 (레이더 차트용). 각 1~5점. */
const CategoryScoresSchema = z.object({
  jobUnderstanding: z.number().int()
    .min(1)
    .max(5)
    .describe('직무 이해도 (1~5)'),
  technicalSkill: z.number().int()
    .min(1)
    .max(5)
    .describe('기술/전문 역량 (1~5)'),
  communication: z.number().int()
    .min(1)
    .max(5)
    .describe('의사 전달력 (1~5)'),
  problemSolving: z.number().int()
    .min(1)
    .max(5)
    .describe('문제 해결력 (1~5)'),
  companyFit: z.number().int()
    .min(1)
    .max(5)
    .describe('회사 적합성 (1~5)'),
});

// 4단계: 면접관 3명이 각자 독립 채점(scoreBreakdown) + 평균 종합점수.
const EvaluationSchema = z.object({
  score: z.number().int()
    .min(1)
    .max(5)
    .describe('면접관 3명 점수의 평균(반올림) 1~5 종합 점수'),
  categoryScores:    CategoryScoresSchema.describe('역량별 세부 점수'),
  interviewerScores: z.array(z.object({
    interviewerId: z.string().describe("면접관 id: 'lead'|'tech'|'hr'"),
    score:         z.number().int()
      .min(1)
      .max(5)
      .describe('해당 면접관의 점수 1~5'),
    comment: z.string().describe('점수 근거 (한국어)'),
  })).describe('면접관 3명의 독립 채점과 근거'),
  feedbackGood:    z.string().describe('답변의 좋은 점'),
  feedbackImprove: z.string().describe('보완하면 좋을 점'),
  betterAnswer:    z.string().describe('더 나은 답변 예시 (한국어)'),
});

// 4-2단계: 면접 종료 후 최종 총평 리포트.
const FinalReportSchema = z.object({
  overallScore: z.number().int()
    .min(0)
    .max(100)
    .describe('100점 만점 종합 점수'),
  recommendation:     z.string().describe("합격 가능성: '강력추천'|'추천'|'보류'|'비추천' 중 하나"),
  interviewerReviews: z.array(z.object({
    interviewerId: z.string().describe("면접관 id: 'lead'|'tech'|'hr'"),
    summary:       z.string().describe('해당 면접관 관점의 총평 (한국어)'),
    strengths:     z.array(z.string()).describe('강점 1~3개'),
    concerns:      z.array(z.string()).describe('우려/개선점 1~3개'),
  })).describe('면접관 3명의 총평'),
  overallSummary: z.string().describe('지원자에게 주는 종합 총평 (한국어, 3~5문장)'),
});

// 2단계: 지원자 이력서 + 회사 분석을 합쳐 만든 개인 맞춤 예상 질문
const ExpectedQuestionsSchema = z.object({ questions: z.array(z.object({
  category: z.string().describe("질문 분류: '이력서'|'기술'|'인성'|'회사' 중 하나"),
  text:     z.string().describe('지원자에게 물을 한 문장 질문 (한국어)'),
  basis:    z.string().describe('이 질문을 뽑은 근거 — 이력서의 어떤 프로젝트/기술/경험 또는 회사 요소 (한 줄)'),
})).describe('이력서와 회사·직무에 맞춘 맞춤 예상 질문 8~12개. 절반 이상은 이력서 내용을 직접 파고드는 질문.') });

/** 프론트 레이더 차트 라벨 매핑용 — 역량 키 ↔ 한국어 라벨 (참고용 상수) */
export const CATEGORY_LABELS: Record<keyof typeof CategoryScoresSchema.shape, string> = {
  jobUnderstanding: '직무이해',
  technicalSkill:   '기술역량',
  communication:    '의사소통',
  problemSolving:   '문제해결',
  companyFit:       '회사적합성',
};

const MAX_CONTEXT = 14_000;
const MAX_RESUME  = 12_000;

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
      const interviewerId = INTERVIEWER_IDS[nextIndex % INTERVIEWER_IDS.length];
      const question = `[모의 ${nextIndex + 1}] ${ctx.session.companyName} ${ctx.session.jobRole} 직무에 지원한 이유를 2~3문장으로 말해보세요.`;

      const turn = await this.prisma.interviewTurn.create({ data: {
        sessionId,
        question,
        interviewerId,
        questionType: QUESTION_TYPES[nextIndex % QUESTION_TYPES.length],
        discussion:   [
          {
            interviewerId: 'lead', comment: '모의 모드: 지원동기부터 확인합시다.',
          },
        ],
        turnIndex: nextIndex,
      } });

      await this.prisma.session.update({
        where: { id: sessionId },
        data:  { phase: 'INTERVIEWING' },
      });

      return {
        turnId:        turn.id,
        question:      turn.question,
        interviewerId: turn.interviewerId,
        interviewer:   interviewerName(turn.interviewerId),
        questionType:  turn.questionType,
        discussion:    turn.discussion,
        turnIndex:     turn.turnIndex,
      };
    }

    const prompt = this.buildPanelQuestionPrompt(ctx, asked, nextIndex);

    const object = await generateStructured(PanelQuestionSchema, prompt);
    const interviewerId = INTERVIEWER_IDS.includes(object.interviewerId)
      ? object.interviewerId
      : INTERVIEWER_IDS[nextIndex % INTERVIEWER_IDS.length];
    const questionType = QUESTION_TYPES.includes(object.questionType)
      ? object.questionType
      : QUESTION_TYPES[nextIndex % QUESTION_TYPES.length];

    const turn = await this.prisma.interviewTurn.create({ data: {
      sessionId,
      question:   object.question,
      interviewerId,
      questionType,
      discussion: object.discussion,
      turnIndex:  nextIndex,
    } });

    await this.prisma.session.update({
      where: { id: sessionId },
      data:  { phase: 'INTERVIEWING' },
    });

    this.logger.log(`패널 질문 생성 session=${sessionId} turn=${turn.id} by=${interviewerId} type=${questionType}`);

    return {
      turnId:        turn.id,
      question:      turn.question,
      interviewerId: turn.interviewerId,
      interviewer:   interviewerName(turn.interviewerId),
      questionType:  turn.questionType,
      discussion:    turn.discussion,
      turnIndex:     turn.turnIndex,
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
          answer:         dto.answer,
          score:          3,
          categoryScores: {
            jobUnderstanding: 3,
            technicalSkill:   3,
            communication:    3,
            problemSolving:   3,
            companyFit:       3,
          },
          scoreBreakdown: INTERVIEWER_IDS.map(id => ({
            interviewerId: id, score: 3, comment: '모의 모드 채점입니다.',
          })),
          speechMetrics:   dto.speechMetrics ?? undefined,
          feedbackGood:    '모의 모드: 구체적으로 말한 점이 좋습니다.',
          feedbackImprove: '실제 서비스에서는 회사·직무에 맞춘 피드백이 생성됩니다.',
          betterAnswer:    '지원 동기 + 본인 경험을 회사 맥락과 연결해 말하는 예시 답변입니다.',
        },
      });

      return {
        turnId:          updated.id,
        score:           updated.score,
        categoryScores:  updated.categoryScores,
        scoreBreakdown:  updated.scoreBreakdown,
        speechMetrics:   updated.speechMetrics,
        feedbackGood:    updated.feedbackGood,
        feedbackImprove: updated.feedbackImprove,
        betterAnswer:    updated.betterAnswer,
      };
    }

    const prompt = this.buildPanelEvaluationPrompt(ctx, pending.question, pending.interviewerId, dto.answer);

    const object = await generateStructured(EvaluationSchema, prompt);

    const updated = await this.prisma.interviewTurn.update({
      where: { id: pending.id },
      data:  {
        answer:          dto.answer,
        score:           object.score,
        categoryScores:  object.categoryScores,
        scoreBreakdown:  object.interviewerScores,
        speechMetrics:   dto.speechMetrics ?? undefined,
        feedbackGood:    object.feedbackGood,
        feedbackImprove: object.feedbackImprove,
        betterAnswer:    object.betterAnswer,
      },
    });

    this.logger.log(`패널 답변 채점 session=${sessionId} turn=${updated.id} score=${updated.score}`);

    return {
      turnId:          updated.id,
      score:           updated.score,
      categoryScores:  updated.categoryScores,
      scoreBreakdown:  updated.scoreBreakdown,
      speechMetrics:   updated.speechMetrics,
      feedbackGood:    updated.feedbackGood,
      feedbackImprove: updated.feedbackImprove,
      betterAnswer:    updated.betterAnswer,
    };
  }

  /** 4-2단계: 면접 종료 후 최종 총평 리포트 생성 + 저장. */
  async finalReport(sessionId: string, userId: string) {
    const ctx = await this.loadContext(sessionId, userId);
    const turns = await this.prisma.interviewTurn.findMany({
      where: {
        sessionId, answer: { not: null },
      },
      orderBy: [{ turnIndex: 'asc' }, { createdAt: 'asc' }],
    });

    if (turns.length === 0) {
      throw new BadRequestException('채점된 답변이 없어 리포트를 만들 수 없습니다.');
    }

    if (process.env.MOCK_ANALYSIS === 'true') {
      const report = {
        overallScore:       60,
        recommendation:     '보류',
        interviewerReviews: INTERVIEWER_IDS.map(id => ({
          interviewerId: id, summary: '모의 모드 총평입니다.', strengths: ['성실함'], concerns: ['구체성 부족'],
        })),
        overallSummary: '모의 모드 종합 총평입니다. 실제 서비스에서는 면접 내용 기반 총평이 생성됩니다.',
      };

      await this.prisma.session.update({
        where: { id: sessionId },
        data:  {
          finalReport: report, phase: 'DONE',
        },
      });

      return report;
    }

    const prompt = this.buildFinalReportPrompt(ctx, turns);
    const report = await generateStructured(FinalReportSchema, prompt);

    await this.prisma.session.update({
      where: { id: sessionId },
      data:  {
        finalReport: report, phase: 'DONE',
      },
    });

    this.logger.log(`최종 리포트 생성 session=${sessionId} overall=${report.overallScore} rec=${report.recommendation}`);

    return report;
  }

  /**
   * 2단계: 지원자 이력서 + 회사 분석을 컨텍스트로 넣어 만든 **맞춤 예상 질문**.
   * 세션에 캐시(session.expectedQuestions)하고, refresh=true 면 다시 생성한다.
   */
  async expectedQuestions(sessionId: string, userId: string, refresh = false) {
    const ctx = await this.loadContext(sessionId, userId);

    const cached = ctx.session.expectedQuestions as
      | {
        questions: {
          category: string; text: string; basis: string;
        }[];
      } |
      null;

    if (!refresh && cached?.questions?.length) {
      return cached;
    }

    const hasResume = !!(ctx.resumeSummaryText || ctx.resumeSnippet);
    const prompt = this.buildExpectedQuestionsPrompt(ctx, hasResume);
    const result = await generateStructured(ExpectedQuestionsSchema, prompt);

    await this.prisma.session.update({
      where: { id: sessionId },
      data:  { expectedQuestions: result },
    });

    this.logger.log(`맞춤 예상 질문 생성 session=${sessionId} n=${result.questions.length} resume=${hasResume}`);

    return result;
  }

  private buildExpectedQuestionsPrompt(ctx: LoadedInterviewContext, hasResume: boolean) {
    return `당신은 한국어 면접 코치입니다. 아래 **지원자 이력서**와 **회사·직무 분석**을 종합해, 이 지원자가 받을 법한 **맞춤 예상 질문 8~12개**를 만드세요.

## 지원 정보
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}

## 회사 분석 요약
${ctx.analysisSnippet}

## 평가 템플릿(참고)
${ctx.evaluationSnippet || '(없음)'}

## 지원자 이력서 요약(JSON)
${ctx.resumeSummaryText || '(없음)'}

## 지원자 이력서 원문 일부
${ctx.resumeSnippet || '(없음)'}

지침:
1. ${hasResume
  ? '**절반 이상은 이력서의 실제 프로젝트·기술·경험을 직접 파고드는 질문**으로 만드세요(예: "이력서의 OO 프로젝트에서 …"). 나머지는 회사·직무 관점 질문.'
  : '이력서 정보가 없으니 회사·직무 분석 기반으로 만드세요.'}
2. 각 질문에 category('이력서'|'기술'|'인성'|'회사')와 basis(근거 한 줄)를 붙이세요.
3. 회사 인재상·기술스택과 연결되게, 한국어로 작성하세요.`;
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

  private buildPanelQuestionPrompt(ctx: LoadedInterviewContext,
    alreadyAsked: string[],
    turnIndex: number) {
    const askedBlock = alreadyAsked.length
      ? `이미 나온 질문 (반복 금지):\n${alreadyAsked.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '(아직 질문 없음 — 첫 질문은 주면접관(lead)이 자기소개/지원동기로 시작)';

    return `당신은 한국어 모의면접의 **면접관 패널 전체**를 연기합니다. 아래 면접관 3명이 서로 짧게 상의(discussion)한 뒤, 그중 가장 적합한 한 명이 지원자에게 **질문 하나**를 던집니다.

## 면접관 패널
${panelRoster()}

## 지원 정보
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}
- 진행 턴(0부터): ${turnIndex}

## 회사 분석 요약
${ctx.analysisSnippet}

## 평가 템플릿 (참고)
${ctx.evaluationSnippet || '(없음)'}

## 지원자 이력서 요약(JSON)
${ctx.resumeSummaryText || '(없음)'}

## 지원자 이력서 일부
${ctx.resumeSnippet || '(없음)'}

## ${askedBlock}

지침:
1. discussion: 면접관들이 "직전 답변 흐름상 무엇을 더 봐야 하는지" 2~3개 발언으로 짧게 토론(지원자에게 안 보임).
2. 그 결론으로 interviewerId(질문할 면접관), questionType(intro/technical/behavioral/culture), question(한 문장 질문)을 정하세요.
3. 질문은 직무·회사·이력서와 연결되게, 유형이 한쪽에 치우치지 않게 다양화하세요. 기술면접관은 기술 깊이를, 인사담당관은 컬처핏/경험을 파고듭니다.`;
  }

  private buildPanelEvaluationPrompt(ctx: LoadedInterviewContext,
    question: string,
    interviewerId: string | null,
    answer: string) {
    return `당신은 한국어 모의면접의 **면접관 3명**을 연기해, 아래 답변을 각자 독립적으로 1~5점 채점하고 평균과 피드백을 냅니다.

## 면접관 패널
${panelRoster()}

## 맥락
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}
- 이 질문을 던진 면접관: ${interviewerName(interviewerId)} (${interviewerId ?? 'lead'})

## 회사/직무 요약
${ctx.analysisSnippet.slice(0, 6_000)}

## 평가 템플릿 (채점 기준)
${ctx.evaluationSnippet || '(없음)'}

## 질문
${question}

## 지원자 답변
${answer}

지침:
1. interviewerScores: lead/tech/hr 세 면접관이 각자 자기 관점(focus)에서 1~5점과 근거를 답니다.
2. score: 세 면접관 점수의 평균을 반올림한 종합 점수(1~5).
3. categoryScores: 5개 역량(jobUnderstanding/technicalSkill/communication/problemSolving/companyFit) 각 1~5.
4. feedbackGood/feedbackImprove/betterAnswer 를 한국어로. 점수 기준: 1=매우 부족, 3=보통, 5=매우 좋음.`;
  }

  private buildFinalReportPrompt(ctx: LoadedInterviewContext,
    turns: {
      question: string | null; answer: string | null; score: number | null;
    }[]) {
    const qa = turns
      .map((t, i) => `Q${i + 1} (${t.score ?? '-'}/5): ${t.question}\nA: ${t.answer}`)
      .join('\n\n');

    return `당신은 한국어 모의면접의 **면접관 패널**입니다. 아래 전체 면접 기록을 바탕으로 최종 총평 리포트를 작성하세요.

## 면접관 패널
${panelRoster()}

## 맥락
- 회사: ${ctx.session.companyName}
- 직무: ${ctx.session.jobRole}

## 회사/직무 요약
${ctx.analysisSnippet.slice(0, 6_000)}

## 평가 템플릿 (채점 기준)
${ctx.evaluationSnippet || '(없음)'}

## 전체 Q&A 와 문항 점수
${qa}

지침:
1. overallScore: 100점 만점 종합 점수.
2. recommendation: '강력추천'|'추천'|'보류'|'비추천' 중 하나.
3. interviewerReviews: lead/tech/hr 각자 관점의 총평 + 강점/우려.
4. overallSummary: 지원자에게 주는 종합 총평 3~5문장. 모두 한국어.`;
  }
}
