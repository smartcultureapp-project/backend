-- CreateTable
CREATE TABLE "resume_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_analyses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (sessions.resumeAnalysisId → resume_analyses)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_resumeAnalysisId_fkey" FOREIGN KEY ("resumeAnalysisId") REFERENCES "resume_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (interview_turns.sessionId → sessions)
ALTER TABLE "interview_turns" ADD CONSTRAINT "interview_turns_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
