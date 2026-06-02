import { generateText, type LanguageModel, tool } from 'ai-v5';
import { z } from 'zod';
import { getAgentModel } from './model-provider';

/**
 * OpenRouter→Anthropic 구조화 출력 헬퍼.
 *
 * - generateObject 는 json_schema response_format 미지원으로 실패 → 강제 tool 콜 사용.
 * - claude-3.5-haiku 는 복잡/긴 스키마에서 **간헐적으로** tool 인자에 Anthropic XML 태그
 *   (`<parameter name="x">…</parameter>`)를 누출시켜 JSON 파싱이 깨진다(input 이 string 으로 옴).
 *   → 누출 태그 정화 후 파싱 + Zod 검증 + 실패 시 재시도로 견고화한다.
 */

/** 깨진 tool 인자(string)를 객체로 강제 변환. 실패 시 null. */
function coerceToObject(raw: unknown): unknown {
  if (raw && typeof raw === 'object') {
    return raw;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    // Anthropic XML 파라미터 태그 누출 정리: `]</parameter>\n<parameter name="x":` → `], "x":`
    const cleaned = raw
      .replace(/<\/parameter>\s*<parameter\s+name="([^"]+)":/g, ', "$1":')
      .replace(/<\/?parameter[^>]*>/g, '');

    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export async function generateStructured<T>(schema: z.ZodType<T>,
  prompt: string,
  attempts = 3): Promise<T> {
  let lastError = '응답 없음';

  for (let i = 0; i < attempts; i++) {
    const { toolCalls } = await generateText({
      model: getAgentModel() as LanguageModel,
      tools: { respond: tool({
        description: '결과를 구조화된 형식으로 반환한다',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: schema as any,
      }) },
      toolChoice: {
        type: 'tool', toolName: 'respond',
      },
      prompt,
    });

    const obj = coerceToObject(toolCalls[0]?.input);
    const parsed = schema.safeParse(obj);

    if (parsed.success) {
      return parsed.data;
    }

    lastError = obj == null ? 'tool 인자 파싱 실패' : '스키마 검증 실패';
  }

  throw new Error(`구조화 출력 생성 실패 (${attempts}회 시도): ${lastError}`);
}
