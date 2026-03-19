-- AlterTable
ALTER TABLE "company_analysis" ADD COLUMN     "actualQuestions" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "interviewProcess" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "interviewTips" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "researchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "logoUrl" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "website" TEXT,
    "headquarters" TEXT,
    "employeeCount" TEXT,
    "foundedYear" INTEGER,
    "stockTicker" TEXT,
    "techBlog" TEXT,
    "careerPage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");
