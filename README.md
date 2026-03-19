# AI 면접 코치

회사명·직군·추가 정보를 입력하면 Mastra AI Agent가 웹 검색으로 회사 인재상, 기술스택, 면접 특징 등을 **딥리서치**하고 구조화된 데이터로 저장하는 API입니다.

## 스택

- **NestJS 10** + SWC
- **Prisma 7** + PostgreSQL
- **Mastra** (Claude 3.5 Haiku)
- **Brave Search API** (웹 검색)

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
| `ANTHROPIC_API_KEY` | ✅* | Claude API 키 |
| `BRAVE_SEARCH_API_KEY` | ⚠️ | 없으면 더미 검색 결과 사용 ([Brave Search API](https://brave.com/search/api/)에서 발급) |
| `MOCK_ANALYSIS` | - | `true` 시 API 키 없이 테스트 모드 |

\* `MOCK_ANALYSIS=true`일 때는 불필요

### 3. DB 실행 및 마이그레이션

```bash
docker-compose up -d
bun run db:push
```

### 4. 서버 실행

```bash
bun run start:dev
```

### 5. 프론트엔드 (선택)

서버 실행 후 브라우저에서 `http://localhost:3000/index.html` 접속. Bootstrap + jQuery 기반 단일 페이지로 분석 시작, SSE 진행 상태, 분석 결과·평가서·회사 정보 조회 가능.

## API

### POST /api/analysis/start

회사 분석 시작. SSE 스트림으로 진행 상황 전송.

**Request**

```json
{
  "companyName": "카카오",
  "jobRole": "프론트엔드 개발자",
  "additionalInfo": "최근 공고 링크: https://..."
}
```

**SSE 이벤트**

- `searching` — 검색 중
- `search_done` — 검색 완료
- `saving` — 분석 저장 중
- `complete` — 완료 (분석 데이터 포함)
- `error` — 오류

### GET /api/analysis/:sessionId

저장된 분석 결과 조회.

## 테스트

### MOCK 모드 (API 키 불필요)

```bash
# .env에 MOCK_ANALYSIS=true 추가
MOCK_ANALYSIS=true bun run start:dev
```

다른 터미널:

```bash
curl -N -X POST http://localhost:3000/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{"companyName":"카카오","jobRole":"프론트엔드","additionalInfo":""}'
```

### 실제 API

`.env`에 `ANTHROPIC_API_KEY` 설정 후 `MOCK_ANALYSIS` 제거.

## 프로젝트 구조

```
src/
├── agent/           # Mastra Agent
│   ├── tools/       # web_search, save_analysis
│   └── interview.agent.ts
├── analysis/        # 분석 API
├── prisma/          # DB 서비스
├── skills/          # Agent 지침 (company-analysis.md)
└── main.ts
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `bun run start:dev` | 개발 서버 (watch) |
| `bun run build` | 빌드 |
| `bun run db:push` | 스키마 DB 반영 |
| `bun run db:studio` | Prisma Studio |
| `bun run lint` | ESLint |

## License

UNLICENSED
