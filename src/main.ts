import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger as PinoLogger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';
import { setupSwaggerAndScalar } from './docs/swagger-setup';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const isMockMode = process.env.MOCK_ANALYSIS === 'true';

  if (isProd) {
    const jwt = process.env.JWT_SECRET ?? '';

    if (!jwt || jwt === 'dev-secret-change-in-production') {
      throw new Error('프로덕션에서는 JWT_SECRET을 안전한 값으로 설정해야 합니다.');
    }
  }

  if (!isMockMode && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 필요합니다. (테스트: MOCK_ANALYSIS=true)');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const logger = new Logger('Bootstrap');

  if (process.env.API_DOCS_ENABLED !== 'false') {
    setupSwaggerAndScalar(app);
    logger.log('API 문서: Scalar /api/docs/scalar · Swagger /api/docs/swagger');
  }

  await app.listen(process.env.PORT ?? 3000);
  logger.log('서버 실행: http://localhost:3000');

  if (isMockMode) {
    logger.warn('MOCK_ANALYSIS=true — API 키 없이 테스트 모드');
  }
}

bootstrap();
