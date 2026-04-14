import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateInterviewTurnSchema = z.object({
  question: z.string().optional(),
  answer:   z.string().optional(),
  score:    z.number().int()
    .optional(),
  feedbackGood:    z.string().optional(),
  feedbackImprove: z.string().optional(),
  betterAnswer:    z.string().optional(),
  turnIndex:       z.number().int()
    .optional(),
});

export class CreateInterviewTurnDto extends createZodDto(CreateInterviewTurnSchema) {}
