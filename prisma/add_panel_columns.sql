-- 3·4단계 멀티에이전트 면접 패널용 컬럼 (전부 nullable 추가 = 기존 데이터 안전)
ALTER TABLE "interview_turns" ADD COLUMN IF NOT EXISTS "questionType" TEXT;
ALTER TABLE "interview_turns" ADD COLUMN IF NOT EXISTS "interviewerId" TEXT;
ALTER TABLE "interview_turns" ADD COLUMN IF NOT EXISTS "discussion" JSONB;
ALTER TABLE "interview_turns" ADD COLUMN IF NOT EXISTS "scoreBreakdown" JSONB;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "finalReport" JSONB;
