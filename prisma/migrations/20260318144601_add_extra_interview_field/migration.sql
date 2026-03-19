-- AlterTable
ALTER TABLE "company_analysis" ADD COLUMN     "interviewAvoid" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "interviewSuccessTips" TEXT NOT NULL DEFAULT '[]';
