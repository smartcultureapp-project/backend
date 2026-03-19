import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { scrapePage } from './scraper';

export const fetchPageTool = createTool({
  id:          'fetch_page',
  description: '검색 결과에서 나온 URL의 실제 페이지 본문을 가져온다. 스니펫만으로 부족할 때 본문을 읽어 깊이 있는 정보를 추출할 때 사용한다.',
  inputSchema: z.object({
    url: z.string().url()
      .describe('가져올 페이지 URL'),
    purpose: z.string().describe('이 페이지를 읽는 목적 (예: 면접 후기 상세 확인)'),
  }),
  execute: async ({ context }) => scrapePage(context.url, context.purpose),
});
