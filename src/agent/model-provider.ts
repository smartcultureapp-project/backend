import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { LanguageModelV1 } from 'ai';

/**
 * Mastra 0.14 `Agent` 타입은 아직 `LanguageModelV1 | LanguageModelV2`만 허용하지만,
 * 런타임은 AI SDK v3(`LanguageModelV3`) 모델과 호환됩니다.
 */
export function toMastraAgentModel(model: LanguageModelV3): LanguageModelV1 {
  return model as unknown as LanguageModelV1;
}

/**
 * LLM_PROVIDER 환경변수로 모델 선택
 * - anthropic (기본): Claude Haiku — `@ai-sdk/anthropic` v3 → LanguageModelV3
 * - openai / google: 동일 세대 SDK
 *
 * Anthropic 세부 모델: ANTHROPIC_MODEL (haiku-4.5 | haiku-3.5 | haiku-3)
 */
export function getAgentModel(): LanguageModelV3 {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';

  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY 필요 (LLM_PROVIDER=openai)');
      }

      return openai('gpt-5.4-mini');

    case 'google':
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY 필요 (LLM_PROVIDER=google)');
      }

      return google('gemini-3-flash-preview');

    case 'anthropic':

    default:
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY 필요');
      }

      const model = process.env.ANTHROPIC_MODEL ?? 'haiku-4.5';

      switch (model) {
        case 'haiku-3':
          return anthropic('claude-3-haiku-20240307');
        case 'haiku-3.5':
          return anthropic('claude-3-5-haiku-20241022');
        case 'haiku-4.5':
        default:
          return anthropic('claude-haiku-4-5-20251001');
      }
  }
}
