import { scrapeWithBasic } from './basic.scraper';
import { scrapeWithFirecrawl } from './firecrawl.scraper';

export type {
  ScrapeResult,
} from './types';

export async function scrapePage(url: string, purpose: string) {
  if (process.env.FIRECRAWL_API_KEY) {
    return scrapeWithFirecrawl(url, purpose);
  }

  return scrapeWithBasic(url, purpose);
}
