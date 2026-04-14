import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import { cleanupOpenApiDoc } from 'nestjs-zod';

const SCALAR_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Interview Coach API — Scalar</title>
</head>
<body>
  <script
    id="api-reference"
    data-configuration='{"theme":"default","spec":{"url":"/api/docs/openapi.json"}}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.41"></script>
</body>
</html>
`;

/**
 * @nestjs/swagger + nestjs-zod `cleanupOpenApiDoc` 로 OpenAPI 3.x 생성.
 * - Swagger UI: /api/docs/swagger
 * - OpenAPI JSON: /api/docs/openapi.json
 * - Scalar: /api/docs/scalar
 */
export function setupSwaggerAndScalar(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Interview Coach API')
    .setDescription('AI 면접 코치 — Zod DTO 기반 요청 검증, JWT Bearer 인증')
    .setVersion('1.0')
    .addBearerAuth({
      type:         'http',
      scheme:       'bearer',
      bearerFormat: 'JWT',
      description:  'Authorization: Bearer {accessToken} — 로그인·회원가입 응답의 accessToken',
    },
    'Bearer')
    .build();

  const raw      = SwaggerModule.createDocument(app, config);
  const document = cleanupOpenApiDoc(raw);

  SwaggerModule.setup('docs/swagger', app, document, {
    swaggerOptions:  { persistAuthorization: true },
    customSiteTitle: 'Interview Coach API (Swagger)',
  });

  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.get('/api/docs/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(document);
  });

  expressApp.get('/api/docs/scalar', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(SCALAR_HTML);
  });

  return document;
}
