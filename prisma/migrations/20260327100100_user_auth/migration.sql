-- DropTable: old User table (Int id, no passwordHash)
DROP TABLE IF EXISTS "User";

-- CreateTable: users (String id, passwordHash, @@map("users"))
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AlterTable: sessions — add userId, resumeAnalysisId, evaluationSheetId, updatedAt
ALTER TABLE "sessions" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "sessions" ADD COLUMN "resumeAnalysisId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "evaluationSheetId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
