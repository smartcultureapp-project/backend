import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email:    z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  name:     z.string().min(1, '이름을 입력하세요'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
