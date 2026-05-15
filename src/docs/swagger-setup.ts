import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function setupSwaggerAndScalar(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Interview Coach API')
    .setDescription('AI 면접 코치 — Zod DTO 기반 요청 검증, JWT Bearer 인증')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'Authorization: Bearer {accessToken}',
      },
      'Bearer',
    )
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
