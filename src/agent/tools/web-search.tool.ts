import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const webSearchTool = createTool({
  id:          'web_search',
  description: '회사 인재상, 기술스택, 면접 후기, 기업문화를 검색한다',
  inputSchema: z.object({
    query:   z.string().describe('검색어'),
    purpose: z.string().describe('이 검색의 목적 (예: 인재상 조사, 기술스택 파악)'),
  }),
  execute: async ({ context }) => {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      return {
        results: [
          {
            title:   `(테스트) ${context.query} 결과 1`,
            url:     'https://example.com/1',
            snippet: `${context.purpose}에 대한 테스트 더미 데이터입니다.`,
          },
          {
            title:   `(테스트) ${context.query} 결과 2`,
            url:     'https://example.com/2',
            snippet: '실제 환경에서는 Brave Search API 결과가 표시됩니다.',
          },
        ],
        purpose: context.purpose,
      };
    }

    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(context.query)}&count=10`,
      { headers: {
        'X-Subscription-Token': apiKey,
        Accept:                 'application/json',
      } });

    if (!res.ok) throw new Error(`Brave Search 오류: ${res.status}`);

    const data    = await res.json();
    const results = (data.web?.results ?? []).slice(0, 10).map((r: {
      title?: string; url?: string; description?: string;
    }) => ({
      title:   r.title ?? '',
      url:     r.url ?? '',
      snippet: r.description ?? '',
    }));

    return {
      results,
      purpose: context.purpose,
    };
  },
});
