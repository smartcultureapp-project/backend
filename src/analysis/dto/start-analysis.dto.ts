import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const StartAnalysisSchema = z.object({
  companyName:    z.string().min(1, '회사명은 필수입니다'),
  jobRole:        z.string().min(1, '직군은 필수입니다'),
  additionalInfo: z.string().optional(),
});

export class StartAnalysisDto extends createZodDto(StartAnalysisSchema) {}
