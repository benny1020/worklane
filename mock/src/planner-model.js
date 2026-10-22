export const TODAY = '2026-10-22';
export const TOMORROW = '2026-10-23';
export const WEEK = ['19', '20', '21', '22', '23'].map((d, i) => ({
  date: `2026-10-${d}`,
  label: ['월', '화', '수', '목', '금'][i],
  day: d,
}));
export const GOALS = [
  {
    id: 'payment',
    title: '결제 실패를 안전하게 복구하기',
    project: 'Payments',
    color: 'green',
    due: '2026-10-29',
    description:
      '재시도부터 환불까지, 고객이 중복 결제 없이 결제를 마칠 수 있도록.',
    start: 12,
    end: 29,
    milestone: '결제 안정화 릴리스',
  },
  {
    id: 'order',
    title: '주문 API v2 출시 준비',
    project: 'Order platform',
    color: 'blue',
    due: '2026-10-30',
    description: '상태 계약을 정리하고 신규 API의 호환성을 검증합니다.',
    start: 5,
    end: 30,
    milestone: 'API v2 계약 동결',
  },
  {
    id: 'ops',
    title: '장애를 더 빠르게 발견하기',
    project: 'Infrastructure',
    color: 'purple',
    due: '2026-10-27',
    description: '알림의 노이즈를 줄이고 대응 절차를 누구나 따라갈 수 있게.',
    start: 19,
    end: 27,
    milestone: '온콜 가이드 공유',
  },
];
export const MEETINGS = [
  {
    date: '2026-10-19',
    time: '09:30',
    minutes: 30,
    title: '주간 계획',
    people: 'Backend · 5명',
  },
  {
    date: '2026-10-19',
    time: '14:00',
    minutes: 60,
    title: 'Sprint 24 킥오프',
    people: 'Platform · 8명',
  },
  {
    date: '2026-10-20',
    time: '10:00',
    minutes: 30,
    title: '데일리 스탠드업',
    people: 'Backend · 5명',
  },
  {
    date: '2026-10-21',
    time: '10:00',
    minutes: 30,
    title: '데일리 스탠드업',
    people: 'Backend · 5명',
  },
  {
    date: '2026-10-21',
    time: '14:00',
    minutes: 60,
    title: 'API 설계 싱크',
    people: 'Platform · 4명',
  },
  {
    date: TODAY,
    time: '09:30',
    minutes: 30,
    title: '데일리 스탠드업',
    people: 'Backend · 5명',
  },
  {
    date: TODAY,
    time: '14:00',
    minutes: 60,
    title: '백엔드 설계 리뷰',
    people: '회의실 2 · 4명',
  },
  {
    date: TOMORROW,
    time: '10:00',
    minutes: 30,
    title: '데일리 스탠드업',
    people: 'Backend · 5명',
  },
  {
    date: TOMORROW,
    time: '16:00',
    minutes: 45,
    title: '주간 회고',
    people: 'Backend · 5명',
  },
];
const task = (id, title, date, minutes, status, goal, extra = {}) => ({
  id,
  title,
  date,
  minutes,
  status,
  sourceStatus: id.startsWith('TODO') ? null : status,
  goal,
  source: id.startsWith('!')
    ? 'GitLab'
    : id.startsWith('TODO')
      ? '개인'
      : 'Jira',
  sprint: id.startsWith('TODO') ? null : '24',
  due: null,
  priority: false,
  notes: [],
  ...extra,
});
export function initialTasks() {
  return [
    task(
      'PAY-368',
      '재시도 정책과 예외 케이스 정리',
      '2026-10-19',
      120,
      'done',
      'payment',
    ),
    task('API-119', '주문 상태 전이 정의', '2026-10-19', 90, 'done', 'order'),
    task('OPS-84', '알림 중복 조건 정리', '2026-10-20', 90, 'done', 'ops'),
    task(
      'PAY-374',
      '멱등성 키 저장 구조 개선',
      '2026-10-20',
      150,
      'done',
      'payment',
    ),
    task('API-122', 'API v2 응답 DTO 구현', '2026-10-21', 120, 'done', 'order'),
    task('!378', '재시도 큐 테스트 리뷰', '2026-10-21', 45, 'done', 'payment'),
    task('PAY-382', '결제 재시도 로직 구현', TODAY, 90, 'progress', 'payment', {
      priority: true,
      time: '10:00',
      due: TOMORROW,
      mr: '!381',
      description:
        '네트워크 오류 시 지수 백오프로 최대 3회 재시도합니다. 동일한 멱등성 키를 유지하고 재시도 소진 시 운영자가 원인을 확인할 수 있어야 합니다.',
    }),
    task('!391', '주문 상태 매핑 변경 리뷰', TODAY, 45, 'todo', 'order', {
      priority: true,
      time: '11:30',
      due: TODAY,
      mr: '!391',
      description:
        'PAID → CONFIRMED 전이와 취소 상태의 하위 호환성을 확인합니다. API-128 변경과 함께 검토하세요.',
    }),
    task('API-128', '주문 API 리팩터링', TODAY, 75, 'progress', 'order', {
      time: '15:15',
      due: '2026-10-27',
      mr: '!395',
    }),
    task('OPS-91', '결제 오류 재현 로그 확인', TODAY, 30, 'blocked', 'ops', {
      blocker: 'SRE 로그 접근 권한 대기',
      due: TOMORROW,
    }),
    task(
      'TODO-15',
      '주문 API 변경 영향 메모',
      '2026-10-21',
      30,
      'todo',
      'order',
    ),
    task('TODO-12', '설계 리뷰 질문 정리', TODAY, 30, 'todo', null),
    task('TODO-10', '배포 후 지표 확인', TODAY, 30, 'done', 'payment'),
    task('TODO-11', '어제 리뷰 코멘트 정리', TODAY, 15, 'done', null),
    task('PAY-291', '환불 웹훅 서명 검증', TOMORROW, 90, 'todo', 'payment', {
      due: TOMORROW,
    }),
    task(
      '!386',
      '재시도 큐 관측 지표 리뷰',
      TOMORROW,
      45,
      'review',
      'payment',
      { mr: '!386' },
    ),
    task('TODO-13', '이번 주 작업 기록 정리', TOMORROW, 30, 'todo', null),
    task(
      'PAY-399',
      '결제 실패 시나리오 통합 테스트',
      '2026-10-26',
      180,
      'todo',
      'payment',
      { due: '2026-10-28' },
    ),
    task('API-145', '주문 API 계약 테스트 추가', null, 120, 'todo', 'order', {
      due: '2026-10-29',
    }),
    task('OPS-104', '온콜 런북 업데이트', null, 60, 'todo', 'ops', {
      due: '2026-10-27',
    }),
    task('TODO-14', '로컬 개발환경 정리', null, 45, 'todo', null),
    task(
      'PAY-410',
      '정기 결제 갱신 정책 검토',
      '2026-10-28',
      90,
      'todo',
      'payment',
      { sprint: '25' },
    ),
  ];
}
export const STATUS = {
  todo: '할 일',
  progress: '진행 중',
  blocked: '막힘',
  review: '리뷰 중',
  done: '완료',
};
export const duration = (m) =>
  `${m >= 60 ? `${Math.floor(m / 60)}시간` : ''}${m % 60 ? `${m >= 60 ? ' ' : ''}${m % 60}분` : m === 0 ? '0분' : ''}`;
export const shortDuration = (m) =>
  `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
export const shortDate = (d) =>
  d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8))}` : '미정';
export const minutesOf = (s) =>
  Number(s.split(':')[0]) * 60 + Number(s.split(':')[1]);
export const timeOf = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function capacity(tasks, date) {
  const meetings = MEETINGS.filter((m) => m.date === date).reduce(
    (n, m) => n + m.minutes,
    0,
  );
  const planned = tasks
    .filter((t) => t.date === date)
    .reduce((n, t) => n + t.minutes, 0);
  const weekday = new Date(date + 'T12:00:00').getDay();
  const available = weekday === 0 || weekday === 6 ? 0 : 480 - meetings - 60;
  return { meetings, planned, available, remaining: available - planned };
}
export function moveTask(tasks, id, date) {
  return tasks.map((t) =>
    t.id === id
      ? { ...t, date: date || null, time: t.date === date ? t.time : undefined }
      : t,
  );
}
export function goalProgress(tasks, id) {
  const all = tasks.filter((t) => t.goal === id);
  return {
    all: all.length,
    done: all.filter((t) => t.status === 'done').length,
  };
}
export function conflicts(tasks, task) {
  if (!task.time || !task.date) return [];
  const start = minutesOf(task.time),
    end = start + task.minutes;
  return [
    ...MEETINGS.filter((m) => m.date === task.date),
    ...tasks.filter((t) => t.id !== task.id && t.date === task.date && t.time),
  ].filter(
    (t) => start < minutesOf(t.time) + t.minutes && end > minutesOf(t.time),
  );
}

// Date-only planning helpers avoid UTC conversion and keep the demo clock fixed.
export function shiftDate(value, days) {
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function weekDays(value) {
  const weekday = new Date(value + 'T12:00:00').getDay();
  const monday = shiftDate(value, -(weekday === 0 ? 6 : weekday - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const date = shiftDate(monday, i);
    return {
      date,
      label: ['월', '화', '수', '목', '금'][i],
      day: String(Number(date.slice(8))),
    };
  });
}
export function monthPeriod(value) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const count = new Date(year, month, 0, 12).getDate();
  const start = `${value.slice(0, 7)}-01`;
  const end = `${value.slice(0, 7)}-${count}`;
  const segments = [];
  let first = 1;
  while (first <= count) {
    const date = `${value.slice(0, 7)}-${String(first).padStart(2, '0')}`;
    const weekday = new Date(date + 'T12:00:00').getDay();
    const last = Math.min(count, first + ((7 - weekday) % 7));
    segments.push({ first, last, days: last - first + 1 });
    first = last + 1;
  }
  return { year, month, count, start, end, segments };
}
export function shiftMonth(value, amount) {
  const date = new Date(value + 'T12:00:00');
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  date.setDate(
    Math.min(
      day,
      new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate(),
    ),
  );
  return dateKey(date);
}
export const SPRINTS = {
  24: { start: '2026-10-19', end: '2026-10-30' },
  25: { start: '2026-11-02', end: '2026-11-13' },
};
export function missedPlans(tasks, before = TODAY) {
  return tasks
    .filter((t) => t.status !== 'done' && t.date && t.date < before)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function goalHealth(tasks, goal) {
  const open = tasks.filter((t) => t.goal === goal.id && t.status !== 'done');
  return {
    open: open.length,
    unplanned: open.filter((t) => !t.date).length,
    blocked: open.filter((t) => t.status === 'blocked').length,
    late: open.filter((t) => t.date && t.date > goal.due).length,
  };
}
export function goalsForMonth(goals, date) {
  const month = monthPeriod(date);
  return goals.filter((g) => g.startDate <= month.end && g.due >= month.start);
}
export function initialPlannerState() {
  return {
    version: 4,
    tasks: initialTasks(),
    goals: GOALS.map((g) => ({
      ...g,
      startDate: `2026-10-${String(g.start).padStart(2, '0')}`,
    })),
    weekFocus: { '2026-10-19': '재시도 구현을 마치고, 주문 API 리뷰까지.' },
    reflections: {},
    reflection: '',
    focusDate: TODAY,
  };
}
export function restorePlannerState(saved) {
  const base = initialPlannerState();
  if (
    saved?.version !== 4 ||
    !Array.isArray(saved.tasks) ||
    !saved.tasks.every(
      (t) =>
        t.id && t.title && Number.isFinite(t.minutes) && t.status in STATUS,
    )
  )
    return base;
  const source = new Map(base.tasks.map((t) => [t.id, t.sourceStatus]));
  return {
    ...base,
    ...saved,
    tasks: saved.tasks.map((t) => ({
      ...t,
      sourceStatus: t.sourceStatus ?? source.get(t.id) ?? null,
    })),
    goals: Array.isArray(saved.goals) ? saved.goals : base.goals,
    weekFocus: saved.weekFocus || base.weekFocus,
    reflections: saved.reflections || {},
  };
}
export function reviewTasks(tasks, view, date, sprint) {
  if (view === 'sprint') return tasks.filter((t) => t.sprint === sprint);
  if (view === 'month')
    return tasks.filter((t) => t.date?.slice(0, 7) === date.slice(0, 7));
  if (view === 'week') {
    const first = weekDays(date)[0].date;
    return tasks.filter(
      (t) => t.date && t.date >= first && t.date <= shiftDate(first, 6),
    );
  }
  return tasks.filter((t) => t.date === date);
}
