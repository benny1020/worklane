# Worklane · 업무 플래너 목업

매일 실행할 일, 주간 배치, 월간 목표, 스프린트 추적을 **하나의 태스크**로 연결하는 인터랙티브 디자인 목업입니다.

## 오늘
![오늘의 업무](screenshots/planner-today.jpg)

## 이번 주
![이번 주 계획](screenshots/planner-week.jpg)

## 이번 달
![이번 달의 목표와 계획](screenshots/planner-month.jpg)

## 스프린트
![스프린트 계획](screenshots/planner-sprint.jpg)

## 실행

```sh
cd mock
npm ci
npm run dev
```

**http://127.0.0.1:5180/**

직접 열기: `/?view=today`, `/?view=week`, `/?view=month`, `/?view=sprint`

```sh
npm run build
npm run preview
node --test src/planner-model.test.js
```

개발 서버와 프로덕션 미리보기는 같은 5180 포트를 사용하므로 하나씩 실행합니다.

## 직접 해보기

1. 할 일을 완료하고 **되돌리기**로 복원합니다.
2. 할 일을 눌러 계획 날짜와 예상 시간을 바꿉니다. 원본 마감일은 유지됩니다.
3. 이번 주에서 회의를 제외한 날짜별 가용 시간을 확인하고 계획함의 업무를 배치합니다.
4. 이번 달에서 목표를 누르면 연결된 태스크가 펼쳐집니다.
5. 스프린트에서 막힌 일을 필터링하거나 다음 스프린트로 이월합니다.
6. **하루 마무리**에서 미완료 업무를 내일로 옮기고 이어갈 기록을 남깁니다.

단축키: `⌘/Ctrl K` 검색, `⌘/Ctrl N` 추가, `⌘/Ctrl J` Assistant, `Esc` 닫기.

## 구현과 검증

- 새 플래너: `src/PlannerMock.jsx`, `src/planner-model.js`, `src/planner.css`
- 이전 홈 디자인: `src/HomeMock.jsx`, `src/planning.js`, `src/styles.css` (실행 진입점에서는 사용하지 않음)
- [리서치 자료, 설계 결정과 테스트 기록](PLANNING_RESEARCH.md)
- 스크린샷: 1440 × 900

모든 데이터는 2026년 10월 22일 기준 샘플입니다. 변경과 개인 기록은 이 브라우저의 `localStorage`에 저장되며, 화면 하단 **샘플 초기화**로 되돌릴 수 있습니다. 실제 Jira/GitLab/Confluence/AI 요청은 없습니다. 월간 목표와 회의는 고정 샘플이고, 실제 외부 상태 변경·MR 승인·코멘트 전송은 수행하지 않습니다. GitHub Pages 배포는 포함하지 않습니다.
