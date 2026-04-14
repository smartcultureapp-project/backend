import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateResumeSchema = z.object({
  rawText:   z.string().min(1, '이력서/자기소개 내용을 입력하세요'),
  sessionId: z.string().min(1)
    .optional(),
});

export class CreateResumeDto extends createZodDto(CreateResumeSchema) {}
