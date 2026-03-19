import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@mastra/core/agent';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { fetchPageTool } from './tools/fetch-page.tool';
import { createSaveAnalysisTool } from './tools/save-analysis.tool';
import { webSearchTool } from './tools/web-search.tool';

export function createAnalysisAgent(
  prismaService: PrismaService,
  sessionId: string,
  companyName: string,
  jobRole: string,
  additionalInfo?: string,
) {
  const skillsPath = join(__dirname, '..', 'skills', 'company-analysis.md');
  const skills = readFileSync(skillsPath, 'utf-8');

  return new Agent({
    id:           'analysis-agent',
    name:         'analysis-agent',
    model:        anthropic('claude-haiku-4-5-20251001'),
    instructions: skills,
    tools:        {
      web_search:    webSearchTool,
      fetch_page:    fetchPageTool,
      save_analysis: createSaveAnalysisTool(
        prismaService,
        sessionId,
        companyName,
        jobRole,
        additionalInfo,
      ),
    },
  });
}
