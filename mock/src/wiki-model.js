export const WIKI_STORE = 'worklane-wiki-v1';
export const SPACES = [
  {
    id: 'pay',
    name: 'Payments',
    key: 'PAY',
    color: 'green',
    description: '결제의 설계 원칙부터 운영까지',
    owner: '최민아',
  },
  {
    id: 'api',
    name: 'Order platform',
    key: 'API',
    color: 'blue',
    description: '주문 API와 서비스 계약',
    owner: '이도현',
  },
  {
    id: 'eng',
    name: 'Engineering',
    key: 'ENG',
    color: 'purple',
    description: '함께 일하는 방식과 운영 지식',
    owner: '박서연',
  },
];
const text = (value, marks) => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});
export const p = (value) => ({
  type: 'paragraph',
  ...(value ? { content: [text(value)] } : {}),
});
const h = (value) => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [text(value)],
});
const list = (items) => ({
  type: 'bulletList',
  content: items.map((value) => ({ type: 'listItem', content: [p(value)] })),
});
const callout = (value) => ({ type: 'blockquote', content: [p(value)] });
const code = (value) => ({
  type: 'codeBlock',
  attrs: { language: 'typescript' },
  content: [text(value)],
});
const table = (rows) => ({
  type: 'table',
  content: rows.map((row, i) => ({
    type: 'tableRow',
    content: row.map((value) => ({
      type: i ? 'tableCell' : 'tableHeader',
      content: [p(value)],
    })),
  })),
});
const doc = (...content) => ({ type: 'doc', content });
export const TEMPLATES = {
  blank: {
    label: '빈 페이지',
    description: '생각을 자유롭게 정리하세요.',
    content: doc(p('')),
  },
  spec: {
    label: '기술 설계',
    description: '배경 → 설계 → 검증 → 출시',
    content: doc(
      h('배경과 목표'),
      p('어떤 문제를 해결하고, 무엇을 성공으로 볼지 적어주세요.'),
      h('제안하는 설계'),
      p('주요 흐름과 변경되는 컴포넌트를 설명해주세요.'),
      h('검증 계획'),
      list(['정상 흐름', '실패 및 재시도', '호환성과 롤백']),
      h('출시 계획'),
      p('배포 순서와 확인할 지표를 적어주세요.'),
    ),
  },
  adr: {
    label: '의사결정 기록',
    description: '맥락과 대안, 결정의 이유를 남기세요.',
    content: doc(
      h('결정이 필요한 이유'),
      p('현재 제약과 해결할 문제를 정리해주세요.'),
      h('검토한 대안'),
      table([
        ['대안', '장점', '고려할 점'],
        ['대안 A', '', ''],
        ['대안 B', '', ''],
      ]),
      h('결정과 근거'),
      p('선택한 방향과 그 이유를 적어주세요.'),
      h('후속 작업'),
      p(''),
    ),
  },
  runbook: {
    label: '운영 런북',
    description: '징후부터 복구까지, 차분한 체크리스트',
    content: doc(
      h('이 문서를 사용할 때'),
      p('대응해야 하는 증상과 서비스 범위를 적어주세요.'),
      h('먼저 확인할 것'),
      list([
        '영향 범위와 최초 발생 시각',
        '최근 배포와 변경 사항',
        'Trace ID와 오류 로그',
      ]),
      h('복구 절차'),
      p('조치 순서와 각 단계의 확인 방법을 적어주세요.'),
      h('에스컬레이션'),
      p('담당자와 연락 경로를 적어주세요.'),
    ),
  },
};
const retry = doc(
  p(
    '일시적인 결제 실패를 안전하게 복구하기 위한 서비스 공통 정책입니다. API, 재시도 큐, 워커가 같은 원칙을 따릅니다.',
  ),
  callout(
    '핵심 원칙 · 한 번의 결제 의도에는 하나의 멱등성 키를 사용합니다. 재시도가 고객의 중복 결제로 이어져서는 안 됩니다.',
  ),
  h('언제 재시도하나요?'),
  p(
    '응답이 없다는 이유만으로 실패를 확정하지 않습니다. 먼저 저장된 결제 상태를 확인하고, 아래 조건에 해당할 때만 재시도를 예약합니다.',
  ),
  table([
    ['실패 조건', '처리 방식', '재시도 한도'],
    ['네트워크 타임아웃 · 502', '지수 백오프 + 지터', '최대 3회'],
    ['요청 제한 · 429', 'Retry-After 우선 적용', '최대 60초 대기'],
    ['검증 실패 · 4xx', '원본 오류를 반환', '재시도하지 않음'],
  ]),
  h('멱등성과 트랜잭션 경계'),
  p(
    '멱등성 키와 요청 상태를 먼저 저장합니다. 외부 PG 호출은 데이터베이스 트랜잭션 밖에서 실행하고, 응답을 받은 뒤 별도 트랜잭션으로 상태를 확정합니다.',
  ),
  list([
    '동일한 키로 들어온 요청은 기존 결제 결과를 반환합니다.',
    '워커는 PG 호출 직전에 최신 상태를 다시 확인합니다.',
    '이미 승인된 요청은 큐에 남아 있어도 처리하지 않습니다.',
  ]),
  h('백오프 계산'),
  code(
    'const delay = Math.min(1_000 * 2 ** attempt, 30_000);\nconst jitter = Math.floor(Math.random() * 250);\n\nawait retryQueue.schedule({\n  paymentId,\n  idempotencyKey, // 모든 시도에서 동일한 키\n  delay: delay + jitter,\n});',
  ),
  h('실패 소진과 운영 대응'),
  p(
    '3회 재시도 후에도 실패하면 자동 처리를 중단하고 운영 확인 대상으로 전환합니다. paymentId, traceId, 마지막 PG 응답을 함께 기록합니다.',
  ),
  h('배포 전 체크리스트'),
  {
    type: 'taskList',
    content: [
      '동일 키 동시 요청 테스트',
      '타임아웃 이후 승인 응답 테스트',
      '큐 중복 전달 및 워커 재시작 테스트',
    ].map((value, index) => ({
      type: 'taskItem',
      attrs: { checked: index < 2 },
      content: [p(value)],
    })),
  },
);
const seeds = [
  [
    'payments-guide',
    'Payments 시작하기',
    'pay',
    null,
    '최민아',
    '가이드',
    doc(
      p('결제 도메인의 설계와 운영 문서를 한곳에서 찾습니다.'),
      h('개발을 시작할 때'),
      list([
        '결제 재시도 정책과 멱등성 키 계약 확인',
        'payment-api 저장소의 로컬 실행',
        '샌드박스 PG에서 승인·취소 흐름 확인',
      ]),
      h('문서 관리 원칙'),
      p('구현 변경 시 관련 설계 문서와 런북을 함께 업데이트합니다.'),
    ),
  ],
  [
    'retry-policy',
    '결제 재시도 정책',
    'pay',
    'payments-guide',
    '최민아',
    '정책',
    retry,
  ],
  [
    'idempotency',
    '멱등성 키 설계',
    'pay',
    'payments-guide',
    '김윤',
    '설계',
    doc(
      p(
        '클라이언트 재전송과 큐 중복 전달에도 결제가 한 번만 실행되도록 합니다.',
      ),
      h('키의 생명주기'),
      p(
        '클라이언트가 요청 전에 키를 생성하고 서버가 결제 결과와 함께 보관합니다. 같은 키의 결과는 24시간 유지합니다.',
      ),
      h('동시성 제어'),
      p(
        '유니크 제약으로 중복 삽입을 막습니다. 처리 중인 요청에는 409와 재조회 경로를 반환합니다.',
      ),
      h('연결된 정책'),
      p('결제 재시도 정책과 동일한 키 유효기간을 사용합니다.'),
    ),
  ],
  [
    'payment-runbook',
    '결제 장애 대응 런북',
    'pay',
    null,
    '박서연',
    '런북',
    doc(
      callout(
        '고객 영향과 최근 배포부터 확인합니다. 운영 조치는 담당자의 확인 후 진행합니다.',
      ),
      h('초기 확인'),
      list([
        '오류율과 결제 승인율 비교',
        '최근 배포의 MR 및 Pipeline 확인',
        'Trace ID로 동일 요청의 로그 연결',
      ]),
      h('타임아웃 증가'),
      p(
        '커넥션 풀 사용률과 PG 응답 시간을 확인합니다. 진행 중인 결제를 확인한 뒤 워커 동시성을 조정합니다.',
      ),
      h('복구 확인'),
      p('승인율 회복, 재시도 큐 소진, 중복 결제 여부를 함께 확인합니다.'),
    ),
  ],
  [
    'refund-webhook',
    '환불 웹훅 검증 명세',
    'pay',
    'payments-guide',
    '김윤',
    '명세',
    doc(
      h('서명 검증'),
      p(
        '원본 요청 바이트에 대한 HMAC 서명을 검증합니다. 파싱 이후 재직렬화된 본문을 사용하지 않습니다.',
      ),
      h('전달 보장'),
      p(
        '같은 이벤트 ID의 웹훅은 한 번만 반영합니다. 처리 결과와 수신 시각을 감사 기록에 남깁니다.',
      ),
    ),
  ],
  [
    'order-guide',
    'Order API 개발 가이드',
    'api',
    null,
    '이도현',
    '가이드',
    doc(
      h('서비스 책임'),
      p('주문 생성, 상태 조회와 배송 수명주기를 관리합니다.'),
      h('호환성 원칙'),
      p(
        '외부 API 상태값을 임의로 추가하지 않습니다. 내부 이벤트는 명시적인 매핑을 거쳐 응답합니다.',
      ),
    ),
  ],
  [
    'order-contract',
    '주문 상태 매핑 · API v2',
    'api',
    'order-guide',
    '이도현',
    '명세',
    doc(
      p('주문 API의 공개 상태는 클라이언트와의 안정적인 계약입니다.'),
      h('상태 전이'),
      table([
        ['내부 상태', 'API 상태'],
        ['PAYMENT_CONFIRMED', 'confirmed'],
        ['FULFILLED', 'fulfilled'],
        ['REFUNDED', 'refunded'],
      ]),
      h('알 수 없는 상태'),
      p(
        '알 수 없는 내부 상태는 typed error와 구조화된 로그를 생성합니다. pending으로 조용히 변환하지 않습니다.',
      ),
    ),
  ],
  [
    'api-errors',
    'API 오류 응답 규약',
    'api',
    'order-guide',
    '김윤',
    '규약',
    doc(
      h('공통 응답'),
      code(
        '{\n  "code": "ORDER_NOT_FOUND",\n  "message": "주문을 찾을 수 없습니다.",\n  "traceId": "trace-482"\n}',
      ),
      h('오류 코드'),
      p(
        '클라이언트가 복구할 수 있는 오류와 운영 확인이 필요한 오류를 구분합니다.',
      ),
    ),
  ],
  [
    'onboarding',
    '백엔드 온보딩',
    'eng',
    null,
    '박서연',
    '가이드',
    doc(
      h('첫 번째 주'),
      list([
        '개발 환경과 최소 권한 신청',
        '서비스 경계와 API 계약 읽기',
        '작은 Jira 이슈로 첫 MR 작성',
      ]),
      h('함께 일하는 시간'),
      p(
        '데일리 09:30 · 백엔드 설계 리뷰 목요일 14:00. 결정과 후속 작업은 문서로 남깁니다.',
      ),
    ),
  ],
  [
    'review-guide',
    '코드 리뷰 가이드',
    'eng',
    'onboarding',
    '최민아',
    '가이드',
    doc(
      h('흐름부터 이해하기'),
      p(
        '변경된 비즈니스 흐름의 시작과 끝을 먼저 확인합니다. API, 이벤트 소비, 배치 작업을 각각 나누어 읽습니다.',
      ),
      h('함께 생각하는 리뷰'),
      list([
        '관찰과 제안을 구분합니다.',
        '실패 조건과 트랜잭션 경계를 질문합니다.',
        '차단 이슈와 선택적 개선을 명확히 표현합니다.',
      ]),
    ),
  ],
  [
    'incident-review',
    '결제 지연 회고 · 10/18',
    'eng',
    null,
    '박서연',
    '회고',
    doc(
      callout('사람을 평가하지 않고 시스템을 개선하기 위한 기록입니다.'),
      h('영향'),
      p(
        '22분간 일부 결제 응답이 지연되었습니다. 중복 결제는 확인되지 않았습니다.',
      ),
      h('원인과 대응'),
      p(
        'PG 커넥션 풀이 포화되었습니다. 워커 동시성을 낮춘 뒤 정상 응답 시간을 회복했습니다.',
      ),
      h('후속 작업'),
      list(['큐 지표 알림 추가', '재시도 한도 검증', '운영 런북 보완']),
    ),
  ],
];
export function initialWikiState() {
  const pages = seeds.map(
    ([id, title, space, parent, author, type, content], index) => ({
      id,
      title,
      space,
      parent,
      author,
      type,
      content,
      published: true,
      version: id === 'retry-policy' ? 4 : 1,
      updated: `2026-10-${String(22 - (index % 6)).padStart(2, '0')}T09:20:00+09:00`,
      labels:
        space === 'pay'
          ? ['payments', 'backend']
          : space === 'api'
            ? ['api', 'contract']
            : ['engineering'],
      summary:
        content.content.find((n) => n.type === 'paragraph')?.content?.[0]
          ?.text || `${title}의 기준과 절차를 정리합니다.`,
      status: id === 'refund-webhook' ? '검토 중' : '최신',
      versions: [
        {
          version: id === 'retry-policy' ? 4 : 1,
          title,
          content,
          author,
          date: '2026.10.22',
          note:
            id === 'retry-policy'
              ? '재시도 한도와 트랜잭션 경계 정리'
              : '문서 작성',
        },
      ],
    }),
  );
  pages.push({
    id: 'retry-adr',
    title: '재시도 큐 분리 결정',
    space: 'pay',
    parent: 'payments-guide',
    author: '김윤',
    type: '의사결정',
    published: false,
    version: 0,
    content: TEMPLATES.adr.content,
    updated: '2026-10-22T10:10:00+09:00',
    labels: ['payments'],
    versions: [],
    status: '초안',
    summary: '동기 재시도를 비동기 큐로 분리하는 이유',
  });
  return {
    pages,
    drafts: {
      'retry-adr': {
        title: '재시도 큐 분리 결정',
        content: TEMPLATES.adr.content,
        savedAt: '2026-10-22T10:10:00+09:00',
      },
    },
    favorites: ['retry-policy', 'payment-runbook', 'order-contract'],
    recent: [
      'retry-policy',
      'order-contract',
      'payment-runbook',
      'review-guide',
    ],
    comments: [
      {
        id: 'comment-1',
        pageId: 'retry-policy',
        author: '이도현',
        initials: 'DH',
        body: '429 응답의 Retry-After가 60초를 넘으면 자동 재시도를 중단하는 것으로 이해하면 될까요?',
        quote: '최대 60초 대기',
        version: 4,
        resolved: false,
        time: '오늘 09:42',
        replies: [],
      },
      {
        id: 'comment-2',
        pageId: 'retry-policy',
        author: '박서연',
        initials: 'SY',
        body: '워커 재시작 시 중복 전달 테스트를 체크리스트에 추가했습니다.',
        quote: '큐 중복 전달 및 워커 재시작 테스트',
        version: 4,
        resolved: false,
        time: '오늘 10:05',
        replies: [],
      },
    ],
  };
}
export function restoreWikiState(value) {
  return value &&
    Array.isArray(value.pages) &&
    value.pages.length &&
    value.drafts &&
    Array.isArray(value.comments) &&
    Array.isArray(value.favorites) &&
    Array.isArray(value.recent)
    ? value
    : initialWikiState();
}
export function documentText(node) {
  return node?.text || (node?.content || []).map(documentText).join(' ');
}
export function searchPages(state, query, space = '') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = state.pages.filter(
    (page) =>
      (!space || page.space === space) &&
      terms.every((term) =>
        `${page.title} ${page.labels.join(' ')} ${documentText(page.content)} ${state.drafts[page.id]?.title || ''} ${documentText(state.drafts[page.id]?.content)}`
          .toLocaleLowerCase()
          .includes(term),
      ),
  );
  const normalized = query.trim().toLocaleLowerCase();
  const score = (page) => {
    const title = page.title.toLocaleLowerCase();
    return title === normalized
      ? 100
      : title.includes(normalized)
        ? 80
        : terms.every((term) => title.includes(term))
          ? 60
          : 0;
  };
  return normalized ? matches.sort((a, b) => score(b) - score(a)) : matches;
}
export function saveWikiDraft(state, id, draft) {
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [id]: { ...draft, savedAt: new Date().toISOString() },
    },
  };
}
export function publishWikiDraft(state, id, note = '') {
  const draft = state.drafts[id];
  const page = state.pages.find((p) => p.id === id);
  if (!page || !draft?.title.trim()) return state;
  const version = page.version + 1;
  const drafts = { ...state.drafts };
  delete drafts[id];
  return {
    ...state,
    drafts,
    pages: state.pages.map((p) =>
      p.id !== id
        ? p
        : {
            ...p,
            title: draft.title.trim(),
            content: draft.content,
            published: true,
            status: '최신',
            version,
            updated: new Date().toISOString(),
            versions: [
              {
                version,
                title: draft.title.trim(),
                content: draft.content,
                author: '김윤',
                date: new Date().toLocaleDateString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                }),
                note: note.trim() || '내용 업데이트',
              },
              ...p.versions,
            ].slice(0, 20),
          },
    ),
  };
}
export function discardWikiDraft(state, id) {
  const page = state.pages.find((p) => p.id === id);
  if (!page) return state;
  const drafts = { ...state.drafts };
  delete drafts[id];
  return {
    ...state,
    drafts,
    ...(page.published
      ? {}
      : {
          pages: state.pages
            .filter((p) => p.id !== id)
            .map((p) => (p.parent === id ? { ...p, parent: page.parent } : p)),
          comments: state.comments.filter((c) => c.pageId !== id),
          favorites: state.favorites.filter((value) => value !== id),
          recent: state.recent.filter((value) => value !== id),
        }),
  };
}
export function pageAncestors(pages, page) {
  const result = [],
    seen = new Set([page.id]);
  let parent = pages.find((p) => p.id === page.parent);
  while (parent && !seen.has(parent.id)) {
    result.unshift(parent);
    seen.add(parent.id);
    parent = pages.find((p) => p.id === parent.parent);
  }
  return result;
}
export function createWikiPage(state, { title, space, parent, template }) {
  const id = `page-${crypto.randomUUID()}`;
  const content = structuredClone(
    TEMPLATES[template]?.content || TEMPLATES.blank.content,
  );
  const page = {
    id,
    title: title.trim(),
    space,
    parent: parent || null,
    author: '김윤',
    type: '문서',
    content,
    published: false,
    version: 0,
    updated: new Date().toISOString(),
    labels: [],
    versions: [],
    status: '초안',
    summary: '',
  };
  return {
    state: {
      ...state,
      pages: [...state.pages, page],
      drafts: { ...state.drafts, [id]: { title: page.title, content } },
    },
    id,
  };
}
