# AI 면접 코치

회사명·직군·추가 정보를 입력하면 Mastra AI Agent가 웹 검색으로 회사 인재상, 기술스택, 면접 특징 등을 **딥리서치**하고 구조화된 데이터로 저장합니다. **JWT 로그인**, **이력서 요약**, **AI 모의 면접**까지 한 흐름으로 이어질 수 있습니다.

## 스택

- **NestJS 10** + SWC
- **Prisma 7** + PostgreSQL
- **Mastra** + AI SDK (Anthropic / OpenAI / Google, `LLM_PROVIDER`로 선택)
- **Brave Search API** (웹 검색, 선택)

## 시작하기

### 1. 의존성 설치

```bash
bun install
```

### 2. 환경 변수

```bash
cp .env.example .env
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | ✅ (프로덕션) | JWT 서명용 비밀키. `NODE_ENV=production`이면 기본값(`dev-secret-change-in-production`)은 **허용되지 않음** |
| `ANTHROPIC_API_KEY` | ✅* | Claude API (`LLM_PROVIDER=anthropic` 또는 미설정 시) |
| `OPENAI_API_KEY` | △ | `LLM_PROVIDER=openai`일 때 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | △ | `LLM_PROVIDER=google`일 때 |
| `LLM_PROVIDER` | - | `anthropic` \| `openai` \| `google` (기본 `anthropic`) |
| `BRAVE_SEARCH_API_KEY` | ⚠️ | 없으면 더미 검색 결과 |
| `MOCK_ANALYSIS` | - | `true`면 API 키 없이 분석·면접 모의 모드 |
| `FIRECRAWL_API_KEY` | - | 있으면 페이지 스크래핑에 Firecrawl 사용 |
| `API_DOCS_ENABLED` | - | `false`면 OpenAPI·Swagger·Scalar 문서 비활성화 (기본: 활성) |

\* `MOCK_ANALYSIS=true`일 때는 LLM 키가 없어도 됨 (일부 기능은 더미 동작).

### API 문서 (OpenAPI + Zod)

요청 DTO는 **nestjs-zod** `createZodDto` + **Zod** 스키마이며, `@nestjs/swagger`로 OpenAPI를 생성한 뒤 **nestjs-zod** `cleanupOpenApiDoc`으로 스키마를 정리합니다.

| URL | 설명 |
|-----|------|
| **GET** `/api/docs/openapi.json` | OpenAPI 3.x JSON |
| **GET** `/api/docs/swagger` | Swagger UI |
| **GET** `/api/docs/scalar` | [Scalar](https://scalar.com) API Reference (위 JSON 로드) |

Scalar·Swagger는 브라우저에서 바로 열 수 있습니다. 인증이 필요한 엔드포인트는 문서에서 **Authorize**에 JWT를 넣으면 됩니다.

### 3. DB

```bash
docker-compose up -d
bun run db:push
# 또는 마이그레이션
bun run db:migrate
```

### 4. 서버 실행

```bash
bun run start:dev
```

### 5. 프론트엔드 (선택)

`http://localhost:3000/index.html` — 로그인·회사 분석(SSE)·세션 ID 자동 채움·이력서 저장·AI 모의 면접 등.

---

## API 개요 (모두 `/api` 접두사, 인증 필요 시 `Authorization: Bearer <token>`)

### 인증

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 → `{ accessToken, user }` |
| POST | `/auth/login` | 로그인 |
| GET | `/auth/me` | 현재 사용자 (Bearer 필요) |

### 회사 분석

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/analysis/start` | 회사 딥리서치 시작 (**SSE**). 캐시 히트 시에도 새 세션 행이 생성되고 `sessionId`로 조회 가능 |
| GET | `/analysis/:sessionId` | 분석 결과 (본인 세션만) |

### 회사

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/company` | 회사 생성 |
| GET | `/company` | 목록 |
| GET | `/company/:id` | 단건 |
| GET | `/company/:id/summary` | 분석·템플릿·회사 요약 |
| GET | `/company/:id/repair` | 회사 정보 보강 |

### 평가 템플릿

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/evaluation-template?analysisId=` | 분석 ID로 조회 (**본인 세션 소유만**) |
| GET | `/evaluation-template?sessionId=` | 세션 ID로 조회 |
| GET | `/evaluation-template/:id` | 템플릿 ID |

### 세션 · 면접

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/sessions` | 내 세션 목록 |
| GET | `/sessions/:id` | 세션 단건 |
| PATCH | `/sessions/:id` | `phase`, `resumeAnalysisId` 등 |
| GET/POST | `/sessions/:id/interview-turns` | 면접 턴 목록 / 수동 추가 |
| POST | `/sessions/:id/interview/next-question` | AI 다음 질문 |
| POST | `/sessions/:id/interview/answer` | body `{ "answer": "..." }` — 평가·저장 |

### 이력서

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/resume` | `{ rawText, sessionId? }` — 저장 후 백그라운드 요약 |
| GET | `/resume` | 목록 |
| GET | `/resume/:id` | 단건 (`summary` 포함) |

---

## 요청 제한

`@nestjs/throttler`로 **전역** 기본 약 **200회/분/IP** (TTL 60초).  
`/auth/register`·`/auth/login`은 더 낮은 제한(15·30회/분)이 별도 적용됩니다.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` — `lint` → `typecheck` → `build` → `test`.

로컬에서 동일하게:

```bash
bun run lint
bun run typecheck
bun run build
bun run test
```

---

## 테스트

### MOCK 모드 (API 키 불필요)

`.env`에 `MOCK_ANALYSIS=true` 후 서버 실행.

```bash
curl -N -X POST http://localhost:3000/api/analysis/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"companyName":"카카오","jobRole":"프론트엔드","additionalInfo":""}'
```

### 단위 테스트

```bash
bun run test
```

---

## 프로젝트 구조 (요약)

```
src/
├── agent/           # Mastra Agent, 도구, model-provider
├── analysis/        # 분석 API (SSE)
├── auth/            # JWT
├── company/
├── evaluation/      # 평가 템플릿
├── resume/          # 이력서 분석
├── session/         # 세션, 모의 면접
├── skills/          # Agent 지침 (md)
└── main.ts
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `bun run start:dev` | 개발 서버 |
| `bun run build` | 빌드 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run test` | Jest |
| `bun run test:e2e` | E2E (설정 시) |
| `bun run db:push` / `db:migrate` | Prisma |

## License

UNLICENSED
