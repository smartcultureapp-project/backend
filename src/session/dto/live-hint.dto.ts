import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// 무음(문장 끝) 시점에 지금까지의 발화를 보내 실시간 코칭 힌트를 받는다.
export const LiveHintSchema = z.object({
  partial: z.string().min(1, '발화 내용이 필요합니다'),
});

export class LiveHintDto extends createZodDto(LiveHintSchema) {}
