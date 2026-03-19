import type { ScrapeResult } from './types';

const MAX_CONTENT_LENGTH = 12_000;
const FETCH_TIMEOUT_MS   = 15_000;

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return text.replace(/\s+/g, ' ').trim();
}

export async function scrapeWithBasic(url: string, purpose: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InterviewCoach/1.0)',
        Accept:       'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false, url, error: `HTTP ${res.status}`, content: '', purpose,
      };
    }

    const html = await res.text();
    const text = extractTextFromHtml(html);

    if (!text || text.length < 100) {
      return {
        success: false, url, error: '본문 추출 실패 또는 내용 부족', content: '', purpose,
      };
    }

    const truncated = text.length > MAX_CONTENT_LENGTH
      ? `${text.slice(0, MAX_CONTENT_LENGTH)}...[이하 생략 (총 ${text.length}자)]`
      : text;

    return {
      success: true, url, content: truncated, length: truncated.length, purpose,
    };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      url,
      error:   message.includes('abort') ? '타임아웃' : message,
      content: '',
      purpose,
    };
  }
}
