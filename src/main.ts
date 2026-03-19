import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const isMockMode = process.env.MOCK_ANALYSIS === 'true';

  if (!isMockMode && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 필요합니다. (테스트: MOCK_ANALYSIS=true)');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const logger = new Logger('Bootstrap');
  await app.listen(process.env.PORT ?? 3000);
  logger.log('서버 실행: http://localhost:3000');

  if (isMockMode) {
    logger.warn('MOCK_ANALYSIS=true — API 키 없이 테스트 모드');
  }
}

bootstrap();
