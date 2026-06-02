import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateResumeSchema = z.object({
  rawText:   z.string().min(1, '이력서/자기소개 내용을 입력하세요'),
  sessionId: z.string().min(1)
    .optional(),
  // 원본 업로드 파일 (선택) — fileData 는 base64 (data URL 의 base64 부분)
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileData: z.string().optional(),
});

export class CreateResumeDto extends createZodDto(CreateResumeSchema) {}
