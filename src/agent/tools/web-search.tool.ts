import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface UrlCitation {
  url?:     string;
  title?:   string;
  content?: string;
}

interface Annotation {
  type?:         string;
  url_citation?: UrlCitation;
}

interface OpenRouterResponse {
  choices?: {
    message?: {
      content?:     string;
      annotations?: Annotation[];
    };
  }[];
  citations?: string[];
}

// 자료조사 = OpenRouter 경유 Perplexity sonar (온라인 검색 + 출처).
// 별도 Perplexity 키 불필요 — OPENROUTER_API_KEY 하나로 처리.
export const webSearchTool = createTool({
  id: 'web_search',
  description:
    'Perplexity sonar(OpenRouter 경유)로 회사 인재상·기술스택·면접 후기·기업문화를 온라인 조사한다. ' +
    '출처 기반 요약(answer)과 출처 목록(results)을 함께 돌려준다. ' +
    'answer 에 핵심 정보가 정리돼 있으니 우선 활용하고, 특정 출처를 더 깊게 보려면 fetch_page 로 해당 url 을 읽는다.',
  inputSchema: z.object({
    query:   z.string().describe('검색/조사 질의'),
    purpose: z.string().describe('이 조사의 목적 (예: 인재상 조사, 기술스택 파악)'),
  }),
  execute: async ({ context }) => {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return {
        purpose: context.purpose,
        answer:  `(테스트) "${context.query}" 더미 조사 결과입니다. 실제 환경에서는 Perplexity 결과가 표시됩니다.`,
        results: [
          {
            title:   `(테스트) ${context.query} 출처 1`,
            url:     'https://example.com/1',
            snippet: `${context.purpose} 관련 테스트 더미 데이터`,
          },
        ],
      };
    }

    const baseURL = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

    const res = await fetch(`${baseURL}/chat/completions`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // OpenRouter 의 Perplexity 온라인 모델 슬러그
        model:    process.env.SEARCH_MODEL ?? 'perplexity/sonar',
        messages: [
          {
            role:    'system',
            content: '너는 한국 채용/면접 리서치 도우미다. 웹 출처에 기반해 사실만, 구체적이고 간결하게 한국어로 정리한다. 추측은 피하고 출처가 불명확하면 그렇다고 말한다.',
          },
          {
            role:    'user',
            content: `조사 목적: ${context.purpose}\n조사 질의: ${context.query}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');

      throw new Error(`자료조사 오류: ${res.status} ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as OpenRouterResponse;
    const message = data.choices?.[0]?.message;
    const answer = message?.content ?? '';

    // 출처: message.annotations(url_citation) 우선, 없으면 top-level citations(URL 배열)
    const fromAnnotations = (message?.annotations ?? [])
      .filter(a => a.type === 'url_citation' && a.url_citation?.url)
      .map(a => ({
        title:   a.url_citation?.title ?? a.url_citation?.url ?? '',
        url:     a.url_citation?.url ?? '',
        snippet: a.url_citation?.content?.slice(0, 200) ?? '',
      }));

    const results = fromAnnotations.length > 0
      ? fromAnnotations
      : (data.citations ?? []).map(url => ({
        title:   url,
        url,
        snippet: '',
      }));

    return {
      purpose: context.purpose,
      answer,
      results,
    };
  },
});
