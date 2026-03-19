import FirecrawlApp from '@mendable/firecrawl-js';
import { scrapeWithBasic } from './basic.scraper';
import type { ScrapeResult } from './types';

const MAX_CONTENT_LENGTH = 12_000;

let client: FirecrawlApp | null = null;

function getClient(): FirecrawlApp {
  if (!client) {
    client = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
  }

  return client;
}

export async function scrapeWithFirecrawl(url: string, purpose: string): Promise<ScrapeResult> {
  try {
    const result = await getClient().scrapeUrl(url, { formats: ['markdown'] });

    if (!result.success) {
      return scrapeWithBasic(url, purpose);
    }

    const markdown = result.markdown ?? '';

    if (markdown.length < 100) {
      return scrapeWithBasic(url, purpose);
    }

    const truncated = markdown.length > MAX_CONTENT_LENGTH
      ? `${markdown.slice(0, MAX_CONTENT_LENGTH)}...[이하 생략 (총 ${markdown.length}자)]`
      : markdown;

    return {
      success: true, url, content: truncated, length: truncated.length, purpose,
    };
  } catch {
    return scrapeWithBasic(url, purpose);
  }
}
