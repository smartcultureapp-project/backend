import type { AgentExecutionOptions } from '@mastra/core/agent';
import { stepCountIs } from 'ai-v5';

/**
 * generateVNext 실행 옵션.
 *
 * `format: 'aisdk'` 를 지정하면 onStepFinish 가 AI SDK v5 의 문서화된 StepResult
 * (`toolCalls[].toolName` / `.input`, `toolResults[].toolName` / `.output`)를 받는다.
 * 지정하지 않으면 Mastra 자체 청크(`.payload` 중첩) 형태라 진행 이벤트 추출이 불안정하다.
 */
type AiSdkRunOptions = AgentExecutionOptions<undefined, undefined, 'aisdk'>;

export function agentRunOptions(maxSteps: number,
  onStepFinish?: AiSdkRunOptions['onStepFinish']): AiSdkRunOptions {
  const base: AiSdkRunOptions = {
    format:   'aisdk',
    stopWhen: stepCountIs(maxSteps),
  };

  return onStepFinish
    ? {
      ...base, onStepFinish,
    }
    : base;
}
