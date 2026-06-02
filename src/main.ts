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

  if (!isMockMode) {
    const llmProvider = process.env.LLM_PROVIDER ?? 'openrouter';
    const requiredKey = {
      openrouter: 'OPENROUTER_API_KEY',
      openai:     'OPENAI_API_KEY',
      google:     'GOOGLE_GENERATIVE_AI_API_KEY',
    }[llmProvider] ?? 'OPENROUTER_API_KEY';

    if (!process.env[requiredKey]) {
      throw new Error(`${requiredKey} 환경변수가 필요합니다 (LLM_PROVIDER=${llmProvider}, 테스트: MOCK_ANALYSIS=true)`);
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  // 이력서 원본 파일(base64)을 본문에 담아 보내므로 기본 100kb 한도를 올린다.
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', {
    limit: '25mb', extended: true,
  });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true });
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const logger = new Logger('Bootstrap');

  if (process.env.API_DOCS_ENABLED !== 'false') {
    setupSwaggerAndScalar(app);
    logger.log('API 문서: Scalar /api/docs/scalar · Swagger /api/docs/swagger');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`서버 실행: http://localhost:${port}`);

  if (isMockMode) {
    logger.warn('MOCK_ANALYSIS=true — API 키 없이 테스트 모드');
  }
}

bootstrap();
