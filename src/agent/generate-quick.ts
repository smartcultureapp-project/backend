import { generateText, type LanguageModel } from 'ai-v5';
import { getAgentModel } from './model-provider';

/**
 * 짧은 텍스트를 빠르게 생성하는 헬퍼(실시간 코칭 힌트용).
 *
 * - 구조화 출력(tool 콜)이 필요 없는 1문장 응답에 사용한다.
 * - 토큰 상한을 작게 잡아 왕복 지연을 줄인다(기본 모델: claude-3.5-haiku).
 */
export async function generateQuickText(prompt: string,
  maxOutputTokens = 120): Promise<string> {
  const { text } = await generateText({
    model: getAgentModel() as LanguageModel,
    prompt,
    maxOutputTokens,
  });

  return text.trim();
}
