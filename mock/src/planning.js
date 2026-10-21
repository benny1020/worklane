export const MOCK_TODAY = '2026-10-21';
export const MOCK_WEEK = [
  { date: '2026-10-19', label: '월', day: '19' },
  { date: '2026-10-20', label: '화', day: '20' },
  { date: MOCK_TODAY, label: '수', day: '21' },
  { date: '2026-10-22', label: '목', day: '22' },
  { date: '2026-10-23', label: '금', day: '23' },
];
function personal(id, title, plannedOn, completed = false) {
  return { id, title, description: title, plannedOn, completed, kind: 'personal', source: '개인', status: '시작 전', repo: '개인 할 일', by: '김윤', initials: 'YK', priority: '보통', minutes: 30, sprint: null };
}
export function createPlanningItems(base) {
  return [
    { ...base[3], plannedOn: MOCK_TODAY, minutes: 90, source: 'Jira', sprint: 'Sprint 24' },
    { ...base[4], plannedOn: MOCK_TODAY, minutes: 120, source: 'Jira', sprint: 'Sprint 24' },
    { ...base[2], plannedOn: MOCK_TODAY, minutes: 45, source: 'Jira', sprint: 'Sprint 24' },
    { ...base[0], plannedOn: MOCK_TODAY, minutes: 45, source: 'GitLab', sprint: 'Sprint 24' },
    { ...base[1], plannedOn: '2026-10-22', dueOn: '2026-10-22', minutes: 45, source: 'Jira', sprint: 'Sprint 24' },
    { ...base[5], plannedOn: '2026-10-23', minutes: 30, source: 'GitLab', sprint: 'Sprint 24' },
    { ...personal('PAY-368', '재시도 멱등성 테스트 보강', '2026-10-19', true), source: 'Jira', sprint: 'Sprint 24', kind: 'issue' },
    { ...personal('API-119', '주문 상태 전환 회귀 테스트', '2026-10-20', true), source: 'Jira', sprint: 'Sprint 24', kind: 'issue' },
    personal('TODO-11', '결제 설계 리뷰 메모 정리', MOCK_TODAY, true),
    personal('TODO-12', '로컬 개발 환경 업데이트', MOCK_TODAY, true),
    personal('TODO-13', '설계 리뷰 후속 내용 문서화', '2026-10-22'),
    { ...personal('PAY-399', '재시도 기능 배포 전 점검', '2026-10-23'), source: 'Jira', sprint: 'Sprint 24', kind: 'issue', minutes: 60 },
    { ...personal('API-145', '주문 API 계약 테스트 추가', null), source: 'Jira', sprint: 'Sprint 24', kind: 'issue', minutes: 60 },
    { ...personal('OPS-104', '오래된 운영 알림 규칙 정리', null), source: 'Jira', sprint: 'Sprint 24', kind: 'issue', minutes: 45 },
    personal('TODO-14', '정산 배치 운영 체크리스트 정리', null),
  ];
}
export function planningCounts(plan, done) {
  const open = plan.filter(x => !done.includes(x.id));
  const sprint = plan.filter(x => x.sprint === 'Sprint 24');
  return {
    today: open.filter(x => x.plannedOn === MOCK_TODAY).length,
    week: open.filter(x => MOCK_WEEK.some(day => day.date === x.plannedOn)).length,
    sprint: sprint.filter(x => !done.includes(x.id)).length,
    backlog: open.filter(x => !x.plannedOn).length,
    todayDone: plan.filter(x => x.plannedOn === MOCK_TODAY && done.includes(x.id)).length,
    sprintTotal: sprint.length,
    sprintDone: sprint.filter(x => done.includes(x.id)).length,
  };
}
