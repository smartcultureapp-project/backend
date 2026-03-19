import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { nanoid } from 'nanoid';
import { createAnalysisAgent } from '../agent/interview.agent';
import { PrismaService } from '../prisma/prisma.service';
import type { StartAnalysisDto } from './dto/start-analysis.dto';

interface ToolCall {
  toolName: string;
  args?:    Record<string, unknown>;
}

interface ToolResult {
  toolName: string;
  result?:  unknown;
}

interface StepPayload {
  stepNumber?:  number;
  toolCalls?:   ToolCall[];
  toolResults?: ToolResult[];
}

type SseEvent =
  {
    type:    'searching';
    purpose: string;
    query:   string;
  } |
  {
    type:    'search_done';
    purpose: string;
    count:   number;
  } |
  {
    type:    'fetching';
    purpose: string;
    url:     string;
  } |
  {
    type:    'fetch_done';
    purpose: string;
    success: boolean;
    length:  number;
  } |
  {
    type:    'saving';
    message: string;
  } |
  {
    type:       'complete';
    sessionId:  string;
    analysisId: string;
    data:       unknown;
  } |
  {
    type:    'error';
    message: string;
  };

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startAnalysis(dto: StartAnalysisDto, res: Response) {
    this.initSse(res);
    const send      = (event: SseEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const sessionId = nanoid();

    if (process.env.MOCK_ANALYSIS === 'true') {
      await this.runMockAnalysis(dto, sessionId, send, res);

      return;
    }

    try {
      this.logger.log(`분석 시작: ${dto.companyName} / ${dto.jobRole}`);

      await this.prisma.session.create({ data: {
        id:             sessionId,
        companyName:    dto.companyName,
        jobRole:        dto.jobRole,
        additionalInfo: dto.additionalInfo ?? null,
      } });

      const agent = createAnalysisAgent(
        this.prisma, sessionId, dto.companyName, dto.jobRole, dto.additionalInfo,
      );
      this.logger.log('Agent 생성 완료, generate() 실행');

      await agent.generate(`회사명: ${dto.companyName}\n지원 직군: ${dto.jobRole}\n추가 정보: ${dto.additionalInfo || '없음'}\n\n위 정보를 바탕으로 company-analysis.md의 **딥리서치** 지침에 따라\n1라운드 기초 조사 → 2라운드 갭 분석 및 심화 검색 → (필요시) 3라운드 보완까지 수행한 뒤,\n수집한 모든 정보를 save_analysis 툴로 저장하세요.`,
        {
          maxSteps:     60,
          onStepFinish: async step => {
            await this.handleStep(step as StepPayload, sessionId, send);
          },
        });

      this.logger.log('Agent generate() 완료');
    } catch (err) {
      this.logger.error('분석 중 오류:', err instanceof Error ? err.message : err);
      if (err instanceof Error && err.stack) this.logger.debug(err.stack);
      send({
        type: 'error', message: '분석 중 오류가 발생했습니다.',
      });
    } finally {
      res.end();
    }
  }

  async getAnalysis(sessionId: string) {
    const analysis = await this.prisma.companyAnalysis.findFirst({ where: { sessionId } });

    return analysis ? this.formatAnalysis(analysis) : null;
  }

  // ---------------------------------------------------------------------------
  // SSE
  // ---------------------------------------------------------------------------

  private initSse(res: Response) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
  }

  // ---------------------------------------------------------------------------
  // Step handler
  // ---------------------------------------------------------------------------

  private async handleStep(step: StepPayload,
    sessionId: string,
    send: (e: SseEvent) => void) {
    const {
      stepNumber,
      toolCalls   = [],
      toolResults = [],
    } = step;

    if (toolCalls.length > 0) {
      this.logger.log(`[Step ${stepNumber ?? '?'}] 툴 ${toolCalls.length}건 실행`);
    }

    for (let i = 0; i < toolCalls.length; i++) {
      const call   = toolCalls[i];
      const result = toolResults[i];

      switch (call?.toolName) {
        case 'web_search':
          this.handleWebSearch(call, result, send);
          break;
        case 'fetch_page':
          this.handleFetchPage(call, result, send);
          break;
        case 'save_analysis':
          await this.handleSaveAnalysis(result, sessionId, send);
          break;
      }
    }
  }

  private handleWebSearch(call: ToolCall,
    result: ToolResult | undefined,
    send: (e: SseEvent) => void) {
    const args    = call.args as {
      query?:   string;
      purpose?: string;
    } | undefined;
    const purpose = args?.purpose ?? '조사 중';
    const query   = args?.query ?? '';

    this.logger.log(`[검색] ${purpose} → "${query}"`);
    send({
      type: 'searching', purpose, query,
    });

    if (result?.result) {
      const r = result.result as {
        purpose?: string;
        results?: unknown[];
      };
      const count = r?.results?.length ?? 0;
      this.logger.log(`[검색 완료] ${r?.purpose ?? purpose} (${count}건)`);
      send({
        type: 'search_done', purpose: r?.purpose ?? purpose, count,
      });
    }
  }

  private handleFetchPage(call: ToolCall,
    result: ToolResult | undefined,
    send: (e: SseEvent) => void) {
    const args = call.args as {
      url?:     string;
      purpose?: string;
    } | undefined;

    this.logger.log(`[본문 읽기] ${args?.purpose ?? ''} → ${args?.url ?? ''}`);
    send({
      type: 'fetching', purpose: args?.purpose ?? '', url: args?.url ?? '',
    });

    if (result?.result) {
      const r = result.result as {
        success?: boolean;
        length?:  number;
      };
      this.logger.log(`[본문 완료] ${r?.success ? `${r?.length ?? 0}자` : '실패'}`);
      send({
        type:    'fetch_done',
        purpose: args?.purpose ?? '',
        success: r?.success ?? false,
        length:  r?.length ?? 0,
      });
    }
  }

  private async handleSaveAnalysis(result: ToolResult | undefined,
    sessionId: string,
    send: (e: SseEvent) => void) {
    this.logger.log('[저장] 분석 결과 정리 중...');
    send({
      type: 'saving', message: '분석 결과 정리 중...',
    });

    const r = result?.result as {
      success?:    boolean;
      analysisId?: string;
      error?:      string;
    } | undefined;

    if (r?.success === false) {
      this.logger.error('[저장 실패]', r.error);
      send({
        type: 'error', message: `저장 실패: ${r.error ?? '알 수 없음'}`,
      });

      return;
    }

    if (r?.success && r?.analysisId) {
      let analysis = await this.getAnalysis(sessionId);

      if (!analysis) {
        analysis = await this.getAnalysisById(r.analysisId);
      }

      this.logger.log(`[완료] sessionId=${sessionId}, analysisId=${r.analysisId}`);
      send({
        type:       'complete',
        sessionId,
        analysisId: r.analysisId,
        data:       analysis,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Mock
  // ---------------------------------------------------------------------------

  private async runMockAnalysis(dto: StartAnalysisDto,
    sessionId: string,
    send: (e: SseEvent) => void,
    res: Response) {
    const mockSteps = [
      {
        purpose: '인재상_1차', query: `${dto.companyName} 인재상 핵심 가치`,
      },
      {
        purpose: '직무역량_1차', query: `${dto.companyName} ${dto.jobRole} 채용공고`,
      },
      {
        purpose: '면접후기_1차', query: `${dto.companyName} 면접 후기 질문`,
      },
      {
        purpose: '기업문화_1차', query: `${dto.companyName} 기업문화 조직문화`,
      },
    ];

    try {
      await this.prisma.session.create({ data: {
        id:             sessionId,
        companyName:    dto.companyName,
        jobRole:        dto.jobRole,
        additionalInfo: dto.additionalInfo ?? null,
      } });

      for (const step of mockSteps) {
        send({
          type: 'searching', purpose: step.purpose, query: step.query,
        });
        await this.delay(800);
        send({
          type: 'search_done', purpose: step.purpose, count: 5,
        });
      }

      send({
        type: 'saving', message: '분석 결과 정리 중...',
      });
      await this.delay(500);

      const analysisId = nanoid();
      await this.prisma.companyAnalysis.create({ data: {
        id:                analysisId,
        sessionId,
        companyName:       dto.companyName,
        jobRole:           dto.jobRole,
        rawAdditionalInfo: dto.additionalInfo ?? null,
        talents:           JSON.stringify([
          '도전', '창의', '협력',
        ]),
        techStack: JSON.stringify([
          '테스트', '모의', '데이터',
        ]),
        cultureKeywords:           JSON.stringify(['수평적', '자율']),
        interviewStyle:            JSON.stringify(['모의 데이터입니다']),
        recommendedQuestionAngles: JSON.stringify(['MOCK_ANALYSIS=true 로 테스트 중']),
        interviewAvoid:            JSON.stringify([]),
        interviewSuccessTips:      JSON.stringify([]),
        searchSources:             JSON.stringify(['https://example.com']),
        companySummary:            `${dto.companyName} 모의 분석 (테스트 모드)`,
        jobRoleSummary:            `${dto.jobRole} 모의 요약`,
        confidenceScore:           50,
      } });

      await this.prisma.session.update({
        where: { id: sessionId },
        data:  {
          companyAnalysisId: analysisId,
          phase:             'READY',
        },
      });

      const analysis = await this.getAnalysis(sessionId);
      send({
        type: 'complete',
        sessionId,
        analysisId,
        data: analysis,
      });
    } catch (err) {
      this.logger.error('모의 분석 오류:', err);
      send({
        type: 'error', message: '모의 분석 중 오류가 발생했습니다.',
      });
    } finally {
      res.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async getAnalysisById(analysisId: string) {
    const analysis = await this.prisma.companyAnalysis.findUnique({ where: { id: analysisId } });

    return analysis ? this.formatAnalysis(analysis) : null;
  }

  private formatAnalysis(analysis: Record<string, unknown>) {
    const parseJson = (val: unknown): string[] => {
      if (typeof val !== 'string') return [];

      try {
        return JSON.parse(val) as string[];
      } catch {
        return [];
      }
    };

    return {
      ...analysis,
      talents:                   parseJson(analysis.talents),
      techStack:                 parseJson(analysis.techStack),
      cultureKeywords:           parseJson(analysis.cultureKeywords),
      interviewStyle:            parseJson(analysis.interviewStyle),
      recommendedQuestionAngles: parseJson(analysis.recommendedQuestionAngles),
      interviewAvoid:            parseJson(analysis.interviewAvoid),
      interviewSuccessTips:      parseJson(analysis.interviewSuccessTips),
      searchSources:             parseJson(analysis.searchSources),
    };
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
