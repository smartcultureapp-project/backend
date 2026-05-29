import type { AgentExecutionOptions } from '@mastra/core/agent';
import { stepCountIs } from 'ai-v5';

export function agentRunOptions(
  maxSteps: number,
  onStepFinish?: AgentExecutionOptions['onStepFinish'],
): AgentExecutionOptions {
  return onStepFinish
    ? { stopWhen: stepCountIs(maxSteps), onStepFinish }
    : { stopWhen: stepCountIs(maxSteps) };
}
