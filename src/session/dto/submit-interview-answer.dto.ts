import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SubmitInterviewAnswerSchema = z.object({
  answer:        z.string().min(1, '답변을 입력하세요'),
  // 5단계: STT 발화 지표 (선택)
  speechMetrics: z.object({
    durationSec: z.number(),
    wordCount:   z.number(),
    wordsPerMin: z.number(),
    fillerCount: z.number(),
    pauseCount:  z.number(),
  }).optional(),
});

export class SubmitInterviewAnswerDto extends createZodDto(SubmitInterviewAnswerSchema) {}
