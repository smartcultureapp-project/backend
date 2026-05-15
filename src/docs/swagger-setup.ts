import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function setupSwaggerAndScalar(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Interview Coach API')
    .setDescription('AI 면접 코치 — Zod DTO 기반 요청 검증, JWT Bearer 인증')
    .setVersion('1.0')
    .addBearerAuth({
      type:         'http',
      scheme:       'bearer',
      bearerFormat: 'JWT',
      description:  'Authorization: Bearer {accessToken}',
    },
    'Bearer')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  SwaggerModule.setup('api/docs/swagger', app, document, { swaggerOptions: { persistAuthorization: true } });

  app.use('/api/docs/scalar', apiReference({ content: document }));
}
