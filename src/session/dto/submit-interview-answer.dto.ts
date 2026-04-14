import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SubmitInterviewAnswerSchema = z.object({ answer: z.string().min(1, '답변을 입력하세요') });

export class SubmitInterviewAnswerDto extends createZodDto(SubmitInterviewAnswerSchema) {}
