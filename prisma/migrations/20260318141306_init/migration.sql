-- CreateTable
CREATE TABLE "company_analysis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobRole" TEXT NOT NULL,
    "rawAdditionalInfo" TEXT,
    "talents" TEXT NOT NULL,
    "techStack" TEXT NOT NULL,
    "cultureKeywords" TEXT NOT NULL,
    "interviewStyle" TEXT NOT NULL,
    "recommendedQuestionAngles" TEXT NOT NULL,
    "searchSources" TEXT NOT NULL,
    "rawSearchResults" TEXT,
    "companySummary" TEXT NOT NULL,
    "jobRoleSummary" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_turns" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT,
    "answer" TEXT,
    "score" INTEGER,
    "feedbackGood" TEXT,
    "feedbackImprove" TEXT,
    "betterAnswer" TEXT,
    "turnIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobRole" TEXT NOT NULL,
    "additionalInfo" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'PREPARING',
    "companyAnalysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
