import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const StartAnalysisSchema = z.object({
  companyId:      z.string().optional(),
  companyName:    z.string().optional(),
  jobRole:        z.string().min(1, '직군은 필수입니다'),
  additionalInfo: z.string().optional(),
  forceRefresh:   z.boolean().optional()
    .default(false),
}).refine(data => data.companyId || data.companyName,
  { message: 'companyId 또는 companyName 중 하나는 필수입니다' });

export class StartAnalysisDto extends createZodDto(StartAnalysisSchema) {}
