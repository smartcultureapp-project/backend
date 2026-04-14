import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateSessionSchema = z.object({
  phase: z.string().min(1)
    .optional(),
  resumeAnalysisId: z.string().min(1)
    .nullable()
    .optional(),
  evaluationSheetId: z.string().min(1)
    .nullable()
    .optional(),
});

export class UpdateSessionDto extends createZodDto(UpdateSessionSchema) {}
