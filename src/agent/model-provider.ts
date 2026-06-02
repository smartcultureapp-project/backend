import { google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { LanguageModelV1 } from 'ai';

/**
 * Mastra 0.14 의 `Agent`/`generateVNext` 는 v2 스펙 모델(`@ai-sdk/*` v2 = `ai` v5 세대)을 요구합니다.
 * Agent 타입 시그니처는 아직 `LanguageModelV1` 이라, 런타임 v2 모델을 타입상으로만 브리지합니다.
 */
export function toMastraAgentModel(model: LanguageModelV2): LanguageModelV1 {
  return model as unknown as LanguageModelV1;
}

/**
 * LLM_PROVIDER 환경변수로 모델 선택 (기본: openrouter)
 * - openrouter (기본): OpenAI 호환 게이트웨이 (OPENROUTER_API_KEY + OPENROUTER_MODEL)
 * - openai / google: 동일 세대 SDK
 */
export function getAgentModel(): LanguageModelV2 {
  const provider = process.env.LLM_PROVIDER ?? 'openrouter';

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

    case 'openrouter':

    default: {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY 필요 (LLM_PROVIDER=openrouter)');
      }

      // OpenRouter 는 OpenAI 호환(/chat/completions) → createOpenAI + baseURL.
      // .chat() 으로 Chat Completions API 강제 (기본 openai() 는 Responses API).
      const openrouter = createOpenAI({
        baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
        apiKey:  process.env.OPENROUTER_API_KEY,
      });

      // 모델은 OpenRouter 슬러그(vendor/model). 툴 콜링 지원 모델이어야 함.
      return openrouter.chat(process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-haiku');
    }
  }
}
