import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const UserProfile = z.object({
  id:    z.string(),
  email: z.string().email(),
  name:  z.string().nullable(),
});

const AuthTokenResponse = z.object({
  accessToken: z.string().describe('JWT accessToken (Authorization: Bearer …)'),
  user:        UserProfile,
});

export class AuthTokenResponseDto extends createZodDto(AuthTokenResponse) {}

const MeResponse = z.object({
  id:        z.string(),
  email:     z.string().email(),
  name:      z.string().nullable(),
  createdAt: z.coerce.date(),
});

export class MeResponseDto extends createZodDto(MeResponse) {}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

const CompanyResponse = z.object({
  id:            z.string(),
  name:          z.string(),
  nameEn:        z.string().nullable(),
  logoUrl:       z.string().nullable(),
  industry:      z.string().nullable(),
  description:   z.string().nullable(),
  website:       z.string().nullable(),
  headquarters:  z.string().nullable(),
  employeeCount: z.string().nullable(),
  foundedYear:   z.number().int()
    .nullable(),
  stockTicker: z.string().nullable(),
  techBlog:    z.string().nullable(),
  careerPage:  z.string().nullable(),
  createdAt:   z.coerce.date(),
  updatedAt:   z.coerce.date(),
});

export class CompanyResponseDto extends createZodDto(CompanyResponse) {}
export class CompanyListResponseDto extends createZodDto(CompanyResponse.array()) {}

const CompanySummaryResponse = z.object({
  company:  CompanyResponse,
  analyses: z.array(z.object({
    id:             z.string(),
    sessionId:      z.string(),
    companyId:      z.string().nullable(),
    companyName:    z.string(),
    jobRole:        z.string(),
    companySummary: z.string(),
    jobRoleSummary: z.string(),
    researchedAt:   z.coerce.date(),
  }).passthrough()),
  evaluationTemplates: z.array(z.object({
    id:                z.string(),
    companyAnalysisId: z.string(),
    companyName:       z.string(),
    jobRole:           z.string(),
    createdAt:         z.coerce.date(),
  }).passthrough()),
});

export class CompanySummaryResponseDto extends createZodDto(CompanySummaryResponse) {}

const CompanyRepairResponse = CompanyResponse.extend({
  repaired: z.boolean(),
  reason:   z.string().optional(),
});

export class CompanyRepairResponseDto extends createZodDto(CompanyRepairResponse) {}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const SessionResponse = z.object({
  id:                z.string(),
  userId:            z.string(),
  companyName:       z.string(),
  jobRole:           z.string(),
  additionalInfo:    z.string().nullable(),
  phase:             z.string(),
  companyAnalysisId: z.string().nullable(),
  resumeAnalysisId:  z.string().nullable(),
  evaluationSheetId: z.string().nullable(),
  createdAt:         z.coerce.date(),
  updatedAt:         z.coerce.date(),
});

export class SessionResponseDto extends createZodDto(SessionResponse) {}
export class SessionListResponseDto extends createZodDto(SessionResponse.array()) {}

// ---------------------------------------------------------------------------
// InterviewTurn
// ---------------------------------------------------------------------------

const InterviewTurnResponse = z.object({
  id:        z.string(),
  sessionId: z.string(),
  question:  z.string().nullable(),
  answer:    z.string().nullable(),
  score:     z.number().int()
    .nullable(),
  feedbackGood:    z.string().nullable(),
  feedbackImprove: z.string().nullable(),
  betterAnswer:    z.string().nullable(),
  turnIndex:       z.number().int()
    .nullable(),
  createdAt: z.coerce.date(),
});

export class InterviewTurnResponseDto extends createZodDto(InterviewTurnResponse) {}
export class InterviewTurnListResponseDto extends createZodDto(InterviewTurnResponse.array()) {}

const NextQuestionResponse = z.object({
  turnId:    z.string(),
  question:  z.string().nullable(),
  turnIndex: z.number().int()
    .nullable(),
});

export class NextQuestionResponseDto extends createZodDto(NextQuestionResponse) {}

const AnswerFeedbackResponse = z.object({
  turnId: z.string(),
  score:  z.number().int()
    .nullable(),
  feedbackGood:    z.string().nullable(),
  feedbackImprove: z.string().nullable(),
  betterAnswer:    z.string().nullable(),
});

export class AnswerFeedbackResponseDto extends createZodDto(AnswerFeedbackResponse) {}

// ---------------------------------------------------------------------------
// CompanyAnalysis (GET /analysis/:sessionId)
// ---------------------------------------------------------------------------

const CompanyAnalysisResponse = z.object({
  id:                        z.string(),
  sessionId:                 z.string(),
  companyId:                 z.string().nullable(),
  companyName:               z.string(),
  jobRole:                   z.string(),
  rawAdditionalInfo:         z.string().nullable(),
  talents:                   z.any(),
  techStack:                 z.any(),
  cultureKeywords:           z.any(),
  interviewStyle:            z.any(),
  recommendedQuestionAngles: z.any(),
  interviewAvoid:            z.any(),
  interviewSuccessTips:      z.any(),
  interviewTips:             z.any(),
  actualQuestions:           z.any(),
  searchSources:             z.any(),
  rawSearchResults:          z.any().nullable(),
  interviewProcess:          z.string(),
  companySummary:            z.string(),
  jobRoleSummary:            z.string(),
  confidenceScore:           z.number().int(),
  researchedAt:              z.coerce.date(),
  createdAt:                 z.coerce.date(),
});

export class CompanyAnalysisResponseDto extends createZodDto(CompanyAnalysisResponse) {}

// ---------------------------------------------------------------------------
// ResumeAnalysis
// ---------------------------------------------------------------------------

const ResumeAnalysisResponse = z.object({
  id:        z.string(),
  userId:    z.string(),
  rawText:   z.string(),
  summary:   z.any().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class ResumeAnalysisResponseDto extends createZodDto(ResumeAnalysisResponse) {}
export class ResumeAnalysisListResponseDto extends createZodDto(ResumeAnalysisResponse.array()) {}

// ---------------------------------------------------------------------------
// EvaluationTemplate
// ---------------------------------------------------------------------------

const EvaluationTemplateResponse = z.object({
  id:                z.string(),
  companyAnalysisId: z.string(),
  companyName:       z.string(),
  jobRole:           z.string(),
  createdAt:         z.coerce.date(),
  stages:            z.any().optional(),
}).passthrough();

export class EvaluationTemplateResponseDto extends createZodDto(EvaluationTemplateResponse) {}
