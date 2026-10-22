# Planning UX · October 22, 2026

## 조사와 반영

실제 제품 문서, 공개 제품 화면, 오픈소스 구현을 검토하고 Worklane의 개인 업무 흐름에 맞춰 재설계했습니다. 외부 소스 코드는 가져오지 않았습니다.

| 참고 자료 | 관찰한 패턴 | 이번 목업에 반영한 내용 |
| --- | --- | --- |
| [Super Productivity](https://super-productivity.com/) · [GitHub](https://github.com/super-productivity/super-productivity) | 날짜별 계획량과 가용 시간, 일정 옆 할 일, 시간 배정과 마감 구분 | 회의와 1시간 버퍼를 뺀 하루 가용량, 초과 표시, 별도 원본 마감, 일정과 태스크를 함께 보는 오른쪽 패널 |
| [Sunsama Weekly Planning](https://help.sunsama.com/docs/usage-guides/weekly-objectives/weekly-planning/) | 주간 목표를 먼저 정하고 일일 실행 작업으로 구체화 | 월간 목표 → 주간 배치 → 오늘의 우선순위 연결, 일일 마무리 기록 |
| [Akiflow Rituals](https://akiflow.featurebase.app/en/help/articles/0805246-rituals) | 계획과 마무리를 연결하고 미완료 작업을 검토 | 미완료 업무의 날짜를 직접 고르는 마무리 화면과 내일 미리보기 |
| [Vikunja Views](https://vikunja.io/help/views/) | 하나의 태스크를 목적에 맞는 여러 보기로 표현 | 일·주·월·스프린트가 하나의 데이터 모델을 사용, 중복 생성 없이 이동 |
| [Plane Cycles](https://docs.plane.so/introduction/tutorials/plan-and-create-cycles) | 기간과 목표가 분명한 사이클, 진행 상황과 다음 사이클 연결 | 스프린트 상태 보드, 막힘 필터, 확인 후 다음 스프린트로 이월 |

### 소스 검토 범위

Super Productivity를 로컬 sparse checkout하여 다음 구현을 읽었습니다.
- 기준 커밋: `f132ebf5a3abf796b15daff068cd976151356f44`
- [planner-day.component.html](https://github.com/super-productivity/super-productivity/blob/f132ebf5a3abf796b15daff068cd976151356f44/src/app/features/planner/planner-day/planner-day.component.html): 날짜별 가용 시간, 할 일과 예약 일정 분리, deadline 영역.
- [planner.reducer.ts](https://github.com/super-productivity/super-productivity/blob/f132ebf5a3abf796b15daff068cd976151356f44/src/app/features/planner/store/planner.reducer.ts): 날짜에 태스크 ID를 배치하고 이동 시 이전 날짜의 중복 참조 제거.

## 설계 결정

- 오늘은 우선순위 두 가지와 그다음 할 일. 상태, 원본 키, 예상 시간, 막힌 이유를 목록에서 확인합니다.
- 주간은 회의와 할 일을 구분하며, 지난 완료 업무는 작은 목록으로 접습니다. 카드가 많으면 해당 날짜 영역에서 스크롤합니다.
- 월간은 한 달의 모든 태스크를 달력 칸에 넣기보다 목표의 기간·마일스톤·연결 업무를 보여줍니다. 구체적인 일정은 동일 태스크의 상세 패널에서 배정합니다.
- 스프린트는 개인 계획과 별도 속성입니다. 개인 계획을 금요일로 옮겨도 스프린트와 원본 마감은 유지됩니다.
- 가용 시간은 평일 8시간에서 회의와 여유 시간 1시간을 뺍니다. 완료 작업도 이미 사용한 당일 계획량에 포함합니다. 주말은 업무 가용 시간을 0으로 둡니다.
- 날짜 변경은 기존 시작 시간을 지웁니다. 새로운 날짜의 회의와 충돌하는 예전 시간까지 무심코 가져오지 않도록 했습니다.
- 15분 간격으로 시작 시간을 고르고, 회의·다른 작업과 겹치거나 근무 시간을 넘으면 상세에서 안내합니다.
- 모든 수정은 브라우저 로컬 목업에만 저장됩니다. 실제 서비스 상태나 외부 커뮤니케이션은 변경하지 않습니다.

## 확인한 동작

1440×900 인앱 브라우저에서 직접 확인:
- 네 가지 기간 보기와 동일 태스크 상세.
- 완료 후 오늘 개수 변경, 되돌리기.
- 계획 날짜 변경, 원본 마감 유지, 마감 이후 계획 경고.
- 날짜 변경 후 주간 보드의 해당 요일로 이동.
- 8시간 작업 배정 시 6시간 15분 초과 표시.
- 시작 시간 변경 시 회의 및 다른 태스크와 겹침 안내.
- 개인 기록 저장 후 새로고침해도 유지.
- 새 할 일을 금요일에 생성하고 주간 보드에서 확인.
- Cmd+K 검색 → Enter → 해당 태스크 상세.
- 하루 마무리 → 미완료 업무 내일 이동 → 내일 화면에서 확인.
- 확인 후 다음 스프린트로 이월하고 되돌리기.

모델 테스트는 태스크 이동 시 중복 방지/원본 마감 유지, 업무량 계산, 목표 진행률, 일정 충돌, 주말 가용량 5건입니다. 네이티브 드래그 핸들러는 구현했으나 이 환경의 포인터 자동화에서는 이동을 확인하지 못했습니다. 날짜 입력으로 이동하는 대체 동작은 검증했습니다.

실제 회사 계정, 백엔드 동기화, 사용자 대상 장기 사용성 테스트는 포함하지 않습니다. 월간 목표와 회의 데이터는 고정 샘플입니다.
