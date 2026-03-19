import { getAgentModel } from './model-provider';
import { Agent } from '@mastra/core/agent';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { fetchPageTool } from './tools/fetch-page.tool';
import { createSaveCompanyInfoTool } from './tools/save-company-info.tool';
import { webSearchTool } from './tools/web-search.tool';

export function createCompanyEnrichmentAgent(prismaService: PrismaService,
  companyId: string,
  companyName: string,
  website?: string | null) {
  const skillsPath = join(__dirname, '..', 'skills', 'company-enrichment.md');
  const skills = readFileSync(skillsPath, 'utf-8');

  return new Agent({
    id:           'company-enrichment-agent',
    name:         'company-enrichment-agent',
    model:        getAgentModel(),
    instructions: skills,
    tools:        {
      web_search:        webSearchTool,
      fetch_page:        fetchPageTool,
      save_company_info: createSaveCompanyInfoTool(prismaService, companyId),
    },
  });
}
