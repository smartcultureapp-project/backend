import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { nanoid } from 'nanoid';
import { createAnalysisAgent } from '../agent/interview.agent';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private isMockMode() {
    return process.env.MOCK_ANALYSIS === 'true';
  }

  async startAnalysis(dto: {
    companyName: string; jobRole: string; additionalInfo?: string;
  },
  res: Response) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');

    const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const sessionId = nanoid();

    if (this.isMockMode()) {
      await this.runMockAnalysis(dto, sessionId, send, res);

      return;
    }

    try {
      this.logger.log(`분석 시작: ${dto.companyName} / ${dto.jobRole}`);

      await this.prismaService.session.create({ data: {
        id:             sessionId,
        companyName:    dto.companyName,
        jobRole:        dto.jobRole,
        additionalInfo: dto.additionalInfo ?? null,
      } });

      const agent = createAnalysisAgent(
        this.prismaService,
        sessionId,
        dto.companyName,
        dto.jobRole,
        dto.additionalInfo,
      );
      this.logger.log('Agent 생성 완료, generate() 실행 (1~3분 소요될 수 있음)');

      await agent.generate(`회사명: ${dto.companyName}
지원 직군: ${dto.jobRole}
추가 정보: ${dto.additionalInfo || '없음'}

위 정보를 바탕으로 company-analysis.md의 **딥리서치** 지침에 따라
1라운드 기초 조사 → 2라운드 갭 분석 및 심화 검색 → (필요시) 3라운드 보완까지 수행한 뒤,
수집한 모든 정보를 save_analysis 툴로 저장하세요.`,
      {
        maxSteps:     60,
        onStepFinish: async step => {
          const stepNum = (step as {
            stepNumber?: number;
          }).stepNumber;
          const { toolCalls = [], toolResults = [] } = step as {
            toolCalls?:   Array<{
              toolName: string; args?: Record<string, unknown>;
            }>;
            toolResults?: Array<{
              toolName: string; result?: unknown;
            }>;
          };

          if (toolCalls.length > 0) {
            this.logger.log(`[Step ${stepNum ?? '?'}] 툴 ${toolCalls.length}건 실행`);
          }

          for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i];
            const result = toolResults[i];

            if (call?.toolName === 'fetch_page') {
              const args = call.args as {
                url?: string; purpose?: string;
              } | undefined;
              this.logger.log(`[본문 읽기] ${args?.purpose ?? ''} → ${args?.url ?? ''}`);
              send({
                type: 'fetching', purpose: args?.purpose ?? '', url: args?.url ?? '',
              });

              if (result?.result) {
                const r = result.result as {
                  success?: boolean; length?: number;
                };
                this.logger.log(`[본문 완료] ${r?.success ? `${r?.length ?? 0}자` : '실패'}`);
                send({
                  type:    'fetch_done',
                  purpose: args?.purpose ?? '',
                  success: r?.success ?? false,
                  length:  r?.length ?? 0,
                });
              }
            } else if (call?.toolName === 'web_search') {
              const args = call.args as {
                query?: string; purpose?: string;
              } | undefined;
              const purpose = args?.purpose ?? '조사 중';
              const query   = args?.query ?? '';
              this.logger.log(`[검색] ${purpose} → "${query}"`);
              send({
                type: 'searching',
                purpose,
                query,
              });

              if (result?.result) {
                const r = result.result as {
                  purpose?: string; results?: unknown[];
                };
                const count = r?.results?.length ?? 0;
                this.logger.log(`[검색 완료] ${r?.purpose ?? purpose} (${count}건)`);
                send({
                  type:    'search_done',
                  purpose: r?.purpose ?? purpose,
                  count,
                });
              }
            } else if (call?.toolName === 'save_analysis') {
              this.logger.log('[저장] 분석 결과 정리 중...');
              send({
                type: 'saving', message: '분석 결과 정리 중...',
              });

              const r = result?.result as {
                success?: boolean; analysisId?: string; error?: string;
              } | undefined;

              if (r?.success === false) {
                this.logger.error('[저장 실패]', r.error);
                send({
                  type: 'error', message: `저장 실패: ${r.error ?? '알 수 없음'}`,
                });
              } else if (r?.success && r?.analysisId) {
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
          }
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

  private async runMockAnalysis(dto: {
    companyName: string; jobRole: string; additionalInfo?: string;
  },
  sessionId: string,
  send: (data: object) => void,
  res: Response) {
    // API 키 없이 SSE·DB 흐름 테스트용
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
      await this.prismaService.session.create({ data: {
        id:             sessionId,
        companyName:    dto.companyName,
        jobRole:        dto.jobRole,
        additionalInfo: dto.additionalInfo ?? null,
      } });

      for (const step of mockSteps) {
        send({
          type: 'searching', purpose: step.purpose, query: step.query,
        });
        await new Promise(r => setTimeout(r, 800));
        send({
          type: 'search_done', purpose: step.purpose, count: 5,
        });
      }

      send({
        type: 'saving', message: '분석 결과 정리 중...',
      });
      await new Promise(r => setTimeout(r, 500));

      const analysisId = nanoid();
      await this.prismaService.companyAnalysis.create({ data: {
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

      await this.prismaService.session.update({
        where: { id: sessionId },
        data:  {
          companyAnalysisId: analysisId, phase: 'READY',
        },
      });

      const analysis = await this.getAnalysis(sessionId);
      send({
        type: 'complete', sessionId, analysisId, data: analysis,
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

  async getAnalysis(sessionId: string) {
    const analysis = await this.prismaService.companyAnalysis.findFirst({ where: { sessionId } });

    return analysis ? this.formatAnalysis(analysis) : null;
  }

  private async getAnalysisById(analysisId: string) {
    const analysis = await this.prismaService.companyAnalysis.findUnique({ where: { id: analysisId } });

    return analysis ? this.formatAnalysis(analysis) : null;
  }

  private formatAnalysis(analysis: {
    talents:                   string;
    techStack:                 string;
    cultureKeywords:           string;
    interviewStyle:            string;
    recommendedQuestionAngles: string;
    searchSources:             string;
    interviewAvoid?:           string;
    interviewSuccessTips?:     string;
    [k: string]:               unknown;
  }) {
    return {
      ...analysis,
      talents:                   JSON.parse(analysis.talents) as string[],
      techStack:                 JSON.parse(analysis.techStack) as string[],
      cultureKeywords:           JSON.parse(analysis.cultureKeywords) as string[],
      interviewStyle:            JSON.parse(analysis.interviewStyle) as string[],
      recommendedQuestionAngles: JSON.parse(analysis.recommendedQuestionAngles) as string[],
      interviewAvoid:            JSON.parse(analysis.interviewAvoid ?? '[]') as string[],
      interviewSuccessTips:      JSON.parse(analysis.interviewSuccessTips ?? '[]') as string[],
      searchSources:             JSON.parse(analysis.searchSources) as string[],
    };
  }
}
