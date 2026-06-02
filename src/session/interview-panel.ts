/**
 * 멀티 에이전트 면접 패널 — 면접관 페르소나 정의.
 * DB 테이블 없이 상수로 관리한다(3단계). voiceHint 는 5단계 TTS 에서 면접관별 목소리 배정에 쓴다.
 */
export interface Interviewer {
  id:        string;
  name:      string;
  role:      string;
  focus:     string;
  voiceHint: string;
}

export const INTERVIEWERS: Interviewer[] = [
  {
    id:        'lead',
    name:      '주면접관',
    role:      '전체 면접 흐름을 조율하는 주면접관(Orchestrator). 자기소개·지원동기·마무리를 담당한다.',
    focus:     '지원 동기, 종합적 사고, 커뮤니케이션',
    voiceHint: 'calm-male',
  },
  {
    id:        'tech',
    name:      '기술면접관',
    role:      '직무 기술 역량을 깊게 검증하는 시니어 엔지니어.',
    focus:     '기술 지식의 깊이와 정확성, 설계·구현 경험, 트레이드오프 판단',
    voiceHint: 'firm-male',
  },
  {
    id:        'hr',
    name:      '인사담당관',
    role:      '회사 인재상 부합과 문화 적합성을 보는 인사담당관.',
    focus:     '가치관, 협업/갈등 경험, 컬처핏, 성장 태도',
    voiceHint: 'warm-female',
  },
];

export const INTERVIEWER_IDS = INTERVIEWERS.map(i => i.id);

export function interviewerName(id: string | null | undefined): string {
  return INTERVIEWERS.find(i => i.id === id)?.name ?? '면접관';
}

/** 질문 유형 4종 (계획서 2단계: intro/technical/behavioral/culture) */
export const QUESTION_TYPES = [
  'intro', 'technical', 'behavioral', 'culture',
];

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  intro:      '인트로',
  technical:  '기술',
  behavioral: '경험/행동',
  culture:    '컬처핏',
};

/** 프롬프트에 끼울 면접관 소개 블록 */
export function panelRoster(): string {
  return INTERVIEWERS
    .map(i => `- ${i.id} (${i.name}): ${i.role} 주 관심사: ${i.focus}`)
    .join('\n');
}
