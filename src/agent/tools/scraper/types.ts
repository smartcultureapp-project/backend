export interface ScrapeResult {
  success: boolean;
  url:     string;
  content: string;
  length?: number;
  error?:  string;
  purpose: string;
}
