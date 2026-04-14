import { Agent } from '@mastra/core/agent';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { getAgentModel, toMastraAgentModel } from './model-provider';
import { createSaveResumeSummaryTool } from './tools/save-resume-summary.tool';

export function createResumeAnalysisAgent(prismaService: PrismaService,
  resumeAnalysisId: string) {
  const skillsPath = join(__dirname, '..', 'skills', 'resume-analysis.md');
  const skills = readFileSync(skillsPath, 'utf-8');

  return new Agent({
    id:           'resume-analysis-agent',
    name:         'resume-analysis-agent',
    model:        toMastraAgentModel(getAgentModel()),
    instructions: skills,
    tools:        { save_resume_summary: createSaveResumeSummaryTool(prismaService, resumeAnalysisId) },
  });
}
