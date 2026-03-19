import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModelV1 } from '@ai-sdk/provider';

/**
 * LLM_PROVIDER 환경변수로 모델 선택
 * - anthropic (기본): Claude Haiku — 품질 우수, 비용 높음
 * - openai: GPT-4o-mini — 약 5배 저렴 ($0.15/$0.60 per 1M)
 * - google: Gemini 2.0 Flash — 저렴, 빠름
 */
export function getAgentModel(): LanguageModelV1 {
  const provider = process.env.LLM_PROVIDER ?? 'anthropic';

  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY 필요 (LLM_PROVIDER=openai)');
      }

      return openai('gpt-4o-mini');

    case 'google':
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY 필요 (LLM_PROVIDER=google)');
      }

      return google('gemini-2.0-flash');

    case 'anthropic':

    default:
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY 필요');
      }

      const model = process.env.ANTHROPIC_MODEL ?? 'haiku-4.5';

      switch (model) {
        case 'haiku-3':
          return anthropic('claude-3-haiku-20240307'); // $0.25/$1.25, deprecated 2026-04
        case 'haiku-3.5':
          return anthropic('claude-3-5-haiku-20241022'); // $0.80/$4.00, legacy
        case 'haiku-4.5':
        default:
          return anthropic('claude-haiku-4-5-20251001'); // $1/$5, 최신
      }
  }
}
