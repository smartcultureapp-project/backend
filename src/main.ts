import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const isMockMode = process.env.MOCK_ANALYSIS === 'true';

  if (!isMockMode && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 필요합니다. (테스트: MOCK_ANALYSIS=true)');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true }); // 개발: 요청 Origin 그대로 허용

  await app.listen(process.env.PORT ?? 3000);
  // eslint-disable-next-line no-console -- bootstrap log
  console.log('서버 실행: http://localhost:3000');

  if (isMockMode) {
    // eslint-disable-next-line no-console -- bootstrap log
    console.log('⚠️  MOCK_ANALYSIS=true — API 키 없이 테스트 모드');
  }
}

bootstrap();
