import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const MAX_CONTENT_LENGTH = 12_000; // 토큰 제한 고려
const FETCH_TIMEOUT_MS = 15_000;

function extractTextFromHtml(html: string): string {
  // script, style 제거
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');
  // HTML 엔티티 디코딩
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 연속 공백/줄바꿈 정리
  return text.replace(/\s+/g, ' ').trim();
}

export const fetchPageTool = createTool({
  id:          'fetch_page',
  description: '검색 결과에서 나온 URL의 실제 페이지 본문을 가져온다. 스니펫만으로 부족할 때 본문을 읽어 깊이 있는 정보를 추출할 때 사용한다.',
  inputSchema: z.object({
    url: z.string().url()
      .describe('가져올 페이지 URL'),
    purpose: z.string().describe('이 페이지를 읽는 목적 (예: 면접 후기 상세 확인)'),
  }),
  execute: async ({ context }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(context.url, {
        signal:  controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InterviewCoach/1.0; +https://github.com/interview-coach)',
          Accept:       'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          success: false,
          url:     context.url,
          error:   `HTTP ${res.status}`,
          content: '',
          purpose: context.purpose,
        };
      }

      const html = await res.text();
      const text = extractTextFromHtml(html);

      if (!text || text.length < 100) {
        return {
          success: false,
          url:     context.url,
          error:   '본문 추출 실패 또는 내용 부족',
          content: '',
          purpose: context.purpose,
        };
      }

      const truncated = text.length > MAX_CONTENT_LENGTH
        ? `${text.slice(0, MAX_CONTENT_LENGTH)}...[이하 생략 (총 ${text.length}자)]`
        : text;

      return {
        success: true,
        url:     context.url,
        content: truncated,
        length:  truncated.length,
        purpose: context.purpose,
      };
    } catch (err) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : String(err);

      return {
        success: false,
        url:     context.url,
        error:   message.includes('abort') ? '타임아웃' : message,
        content: '',
        purpose: context.purpose,
      };
    }
  },
});
