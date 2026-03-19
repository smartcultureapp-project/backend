export interface SampleQuestion {
  question:          string;
  intent:            string;
  goodAnswerExample: string;
  badAnswerExample:  string;
}

export interface EvaluationCriterion {
  name:            string;
  description:     string;
  type:            'score' | 'descriptive' | 'hybrid';
  maxScore?:       number;
  rubric?:         Record<string, string>;
  modelAnswer?:    string;
  evaluationGuide: string;
  sampleQuestions: SampleQuestion[];
}

export interface EvaluationSection {
  name:     string;
  weight:   number;
  criteria: EvaluationCriterion[];
}

export type Verdict =
  | 'strong_hire' |
  'hire' |
  'lean_hire' |
  'lean_no_hire' |
  'no_hire' |
  'strong_no_hire';

export interface InterviewStage {
  name:           string;
  description:    string;
  sections:       EvaluationSection[];
  verdictOptions: Verdict[];
}

export interface EvaluationTemplateData {
  stages: InterviewStage[];
}
