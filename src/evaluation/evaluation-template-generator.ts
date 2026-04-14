import type { EvaluationTemplateData } from './types/evaluation-template.types';

const DEFAULT_RUBRIC: Record<string, string> = {
  1: '기본 개념 이해 부족, 관련 경험 없음',
  2: '기본은 아나 실무 적용 경험 부족',
  3: '실무 수준의 이해와 경험 보유',
  4: '깊은 이해, 다양한 실무 경험, 개선 사례',
  5: '전문가 수준, 팀 리드 또는 혁신 사례',
};

export function generateTemplateFromAnalysis(analysis: {
  companyName:           string;
  jobRole:               string;
  talents?:              unknown[];
  techStack?:            unknown[];
  interviewStyle?:       unknown[];
  actualQuestions?:      unknown[];
  interviewAvoid?:       unknown[];
  interviewSuccessTips?: unknown[];
}): EvaluationTemplateData {
  const tech = analysis.techStack?.slice(0, 5) as string[] ?? [];
  const questions = analysis.actualQuestions?.slice(0, 5) as string[] ?? [];

  const verdictOptions = [
    'strong_hire',
    'hire',
    'lean_hire',
    'lean_no_hire',
    'no_hire',
    'strong_no_hire',
  ] as const;

  return { stages: [
    {
      name:           '1차 면접',
      description:    `${analysis.companyName} ${analysis.jobRole} 직무·역량 평가`,
      verdictOptions: [...verdictOptions],
      sections:       [
        {
          name:     '직무 기술 역량',
          weight:   35,
          criteria: [
            {
              name:            '기술·도구 이해도',
              description:     tech.length ? `${tech.join(', ')} 등 관련 역량` : '직군 요구 역량',
              type:            'score',
              maxScore:        5,
              rubric:          DEFAULT_RUBRIC,
              evaluationGuide: '구체적 경험과 이해도를 확인',
              sampleQuestions: [
                {
                  question:          questions[0] ?? '본인이 가장 자신 있는 기술/역량은 무엇인가요?',
                  intent:            '기술 이해도',
                  goodAnswerExample: '구체적 경험과 숫자로 설명',
                  badAnswerExample:  '모호한 일반론',
                },
              ],
            },
          ],
        },
        {
          name:     '문제 해결',
          weight:   25,
          criteria: [
            {
              name:            '문제 해결 경험',
              description:     '복잡한 문제를 어떻게 접근했는지',
              type:            'hybrid',
              maxScore:        5,
              rubric:          DEFAULT_RUBRIC,
              modelAnswer:     'STAR 기법으로 문제 상황, 해결 과정, 결과를 구체적으로',
              evaluationGuide: '논리적 사고와 실행력 확인',
              sampleQuestions: [
                {
                  question:          '어려운 문제를 해결한 경험을 말해주세요.',
                  intent:            '문제 해결 능력',
                  goodAnswerExample: '상황·과제·행동·결과를 구체적으로',
                  badAnswerExample:  '추상적 설명',
                },
              ],
            },
          ],
        },
        {
          name:     '커뮤니케이션',
          weight:   20,
          criteria: [
            {
              name:            '기술 설명 명확성',
              description:     '복잡한 개념을 명확히 전달하는 능력',
              type:            'score',
              maxScore:        5,
              rubric:          DEFAULT_RUBRIC,
              evaluationGuide: '구조적·논리적 설명 여부',
              sampleQuestions: [
                {
                  question:          '지난 프로젝트를 비개발자에게 설명해보세요.',
                  intent:            '설명 능력',
                  goodAnswerExample: '핵심을 간결히, 예시 활용',
                  badAnswerExample:  '전문 용어 나열',
                },
              ],
            },
          ],
        },
        {
          name:     '성장·가치관',
          weight:   20,
          criteria: [
            {
              name:        '기업 가치관 부합',
              description: (analysis.talents as string[])?.length
                ? `${(analysis.talents as string[]).join(', ')} 등 인재상과의 부합`
                : '기업 문화·가치관 부합',
              type:            'hybrid',
              maxScore:        5,
              rubric:          DEFAULT_RUBRIC,
              modelAnswer:     '회사 인재상·문화와 연결된 구체적 경험',
              evaluationGuide: '가치관과 동기 부합 여부',
              sampleQuestions: [
                {
                  question:          '우리 회사에 지원한 이유는?',
                  intent:            '동기·가치관',
                  goodAnswerExample: '회사 특성과 본인 경험 연결',
                  badAnswerExample:  '일반적인 답변',
                },
              ],
            },
          ],
        },
      ],
    },
  ] };
}
