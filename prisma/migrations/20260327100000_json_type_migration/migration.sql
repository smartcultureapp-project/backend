-- AlterTable: company_analysis — convert String columns to JSONB
ALTER TABLE "company_analysis" ALTER COLUMN "talents" TYPE JSONB USING "talents"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "techStack" TYPE JSONB USING "techStack"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "cultureKeywords" TYPE JSONB USING "cultureKeywords"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "interviewStyle" TYPE JSONB USING "interviewStyle"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "recommendedQuestionAngles" TYPE JSONB USING "recommendedQuestionAngles"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "interviewAvoid" TYPE JSONB USING "interviewAvoid"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "interviewSuccessTips" TYPE JSONB USING "interviewSuccessTips"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "interviewTips" TYPE JSONB USING "interviewTips"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "actualQuestions" TYPE JSONB USING "actualQuestions"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "searchSources" TYPE JSONB USING "searchSources"::jsonb;
ALTER TABLE "company_analysis" ALTER COLUMN "rawSearchResults" TYPE JSONB USING "rawSearchResults"::jsonb;

-- AlterTable: evaluation_templates — convert template String to JSONB
ALTER TABLE "evaluation_templates" ALTER COLUMN "template" TYPE JSONB USING "template"::jsonb;
