import { Agent } from '@mastra/core/agent';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { getAgentModel, toMastraAgentModel } from './model-provider';
import { fetchPageTool } from './tools/fetch-page.tool';
import { createSaveCompanyInfoTool } from './tools/save-company-info.tool';
import { webSearchTool } from './tools/web-search.tool';

export function createCompanyEnrichmentAgent(prismaService: PrismaService,
  companyId: string,
  _companyName: string,
  _website?: string | null) {
  const skillsPath = join(__dirname, '..', 'skills', 'company-enrichment.md');
  const skills = readFileSync(skillsPath, 'utf-8');

  return new Agent({
    id:           'company-enrichment-agent',
    name:         'company-enrichment-agent',
    model:        toMastraAgentModel(getAgentModel()),
    instructions: skills,
    tools:        {
      web_search:        webSearchTool,
      fetch_page:        fetchPageTool,
      save_company_info: createSaveCompanyInfoTool(prismaService, companyId),
    },
  });
}
