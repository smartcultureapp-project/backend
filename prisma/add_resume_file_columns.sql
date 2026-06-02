-- 등록된 이력서의 원본 파일 저장용 (nullable 추가 = 기존 데이터 안전)
ALTER TABLE "resume_analyses" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "resume_analyses" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
ALTER TABLE "resume_analyses" ADD COLUMN IF NOT EXISTS "fileData" TEXT;
