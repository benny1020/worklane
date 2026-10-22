# Worklane planner usability review

Reviewed: 2026-10-22. Reviewer: independent usability critic. Scope: standalone `mock/`; no application-source changes, browser interaction, backend work, commits, or publishing performed.

## Evidence and conclusion

I inspected the saved 1440×900 `planner-today.jpg`, `planner-week.jpg`, `planner-month.jpg`, and `planner-sprint.jpg` plus `PlannerMock.jsx`, `planner-model.js`, and `planner.css`. The line references below identify the initial reviewed source (`PlannerMock.jsx`: 1,947 lines; CSS: 2,750 lines) and may shift during concurrent implementation. Screenshot observations and source inference are explicitly separated. **No live usability test has been performed by this reviewer.**

The four views share recognizable tasks and a coherent calm appearance. Date versus original deadline is correctly separated in the model, daily priorities are visible, and modal focus trapping, keyboard search, local persistence, and reversible date moves already provide a useful foundation. However, a professional cannot yet reliably carry unfinished work across days/weeks, correct a captured task, or distinguish personal completion from an external workflow state. Those are more urgent than additional dashboard decoration.

## Top five issues

### 1. P1 — Unfinished work and future periods lose continuity

- **Code inference:** Today uses only `t.date === day` (`PlannerMock.jsx:125–127`), so yesterday's unfinished tasks have no carryover/overdue entry point. The supplied Monday–Wednesday tasks are all done, which conceals this first-use failure in screenshots.
- **Screenshot + code:** Week is fixed to October 19–23 (`.section-top`, JSX:637–655; `WEEK`, model:3–7). `PAY-399` is already planned for October 26, but there is no next-week control. Month is fixed October and the headline promises goal planning while `Month()` only reads constant `GOALS` and filters detail (`JSX:1543–1692`).
- **Code inference:** Month and Sprint “계획 돌아보기” reuse the fixed Week task filter (`JSX:1134–1183`), omitting the second week of the sprint. Their closing action always opens the fixed `TOMORROW`.
- **Change:** Provide previous/current/next week navigation and contextual day selection; expose a small “지난 계획에서 남은 일” group with reschedule actions. Make review scope explicit and derive it from the selected day/week/sprint. For Month, offer a local goal edit flow or label the screen honestly as a goal overview.
- **Acceptance:** Move an unfinished item from October 22 to 26, navigate to the next week, and see it there. Open October 23 with unfinished October 22 work and find that work without searching. Sprint review includes October 26–30.

### 2. P1 — Personal actions look like Jira/GitLab workflow changes

- **Code inference:** `toggle()` writes the same `status` used by Sprint columns and goal completion (`JSX:162–170`, `865–897`; model `goalProgress`). Inspector labels this field “작업 상태” and its main action “내 작업 완료” (`JSX:1711–1723`, `1883–1891`). There is no separately displayed source status.
- **Screenshot:** Jira keys, GitLab review IDs, Sprint progress, and completion checkboxes occupy the same cards. The sample-workspace badge does not explain which state a checkbox changes. The detailed local-only explanation is at the bottom of the inspector; source/state boundaries are not visible at the moment of action.
- **Code inference:** `TaskCard` shows priority *instead of* a deadline (`JSX:1477–1487`), hiding `!391`'s today deadline on the weekly priority card. Blocked work is placed under “진행 중” (`JSX:865–873`), requiring the small amber note to carry its meaning.
- **Change:** Label the editable state “내 진행 상태” and show any original source state separately as read-only sample context. Explain “내 계획만 변경 · 원본 미반영” next to the editing controls. Keep urgent deadlines visible alongside priority. Preserve an explicit blocked badge regardless of its containing column.
- **Acceptance:** A first-time reviewer can tell, before clicking Complete, whether Jira changes. Complete/undo and status-column moves update only the intended local state; due-today and blocked information survives all views and filters.

### 3. P1 — Capture has no adequate correction and recovery loop

- **Code inference:** Creation stores a title, but Inspector renders the title as a fixed `<h2>` with no rename/delete path (`JSX:188–206`, `1709`). A spelling mistake or accidental duplicate requires resetting the entire sample.
- **Code inference:** `update()` provides Undo only when text is supplied and otherwise clears the existing toast (`JSX:144–155`). Inspector status/time/estimate/sprint edits and priority toggles omit text, so those changes have no Undo and can dismiss the Undo for a previous date move. Reflection is one shared string for every date and period (`readState`, `JSX:1185–1193`).
- **Change:** Add local title editing and a clearly separated archive/delete action with Undo. Give meaningful state edits consistent reversible feedback. Store review notes by date/period so yesterday's reflection is not silently reused or overwritten as today's.
- **Acceptance:** Create, rename, remove, and restore a task without resetting. Change date, then estimate/status, and recover each intentional edit. Review notes for two days remain distinct after reload.

### 4. P2 — Scheduling controls do not consistently honor visible context

- **Code inference:** The backlog's “오늘에 배치” always uses `TODAY`, even while a different day is open (`JSX:960–965`). Global Add uses `day`, independent of the visible Week/Month/Sprint (`JSX:182–206`, `403`). In Sprint 25 this can produce an October 22 personal task that does not appear in the current sprint.
- **Code inference:** Clicking the 17:00 “비워둔 시간” runs `quick(day)` but creation has no start-time field (`JSX:1532–1538`, `1049–1074`), so the new task is not placed at 17:00. This is a spatial promise the action does not fulfill.
- **Screenshot + code:** The capacity bar counts all estimated work, including completed work (model `capacity:230–246`), while the list primarily displays unfinished work. The arithmetic is internally consistent, but “15분 여유” can be read as remaining time from now rather than an all-day planning estimate. The explicit “시간이 정해진 일만 표시” explanation is below the first screenshot viewport.
- **Change:** Use an explicit, visible target date for Add/backlog scheduling, prefill the selected slot's time, and distinguish “하루 전체 계획” from remaining work. Explain untimed work adjacent to the agenda heading. Ensure any sprint-add action either assigns the selected sprint or says it is creating a personal task outside that sprint.
- **Acceptance:** Open tomorrow, plan an inbox item, and see its target date before applying. Add from 17:00 and verify its start time. Create from Sprint 25 and find the item immediately in the intended context.

### 5. P2 — Working information is too small; important affordances fall below the fold

- **Screenshot:** Across all four captures, source IDs, durations, deadlines, agenda metadata, and progress totals are much smaller and lighter than the task titles. The Week screen devotes three tall columns to completed past-day work while Thursday's five open tasks require internal scrolling. The fourth Thursday card is cut near the footer and the fifth is absent from the initial viewport.
- **Code evidence:** `.source`, `.card-bottom`, `.agenda-event-label`, `.week-day > footer`, and related rules resolve to roughly 9–11px text through layered overrides. `.week-task-list` is fixed to 350px with its own `overflow: auto` (`CSS:2593–2598`), inside the independently scrolling `.planner-main` (`CSS:397–401`). The drag instruction follows the whole grid (`JSX:744–756`); the personal-plan/sprint distinction follows the whole board (`JSX:912–921`).
- **Code inference:** Cards are draggable, but only the title is the main detail button; the whole card surface is not a clear open target (`TaskCard`). Sidebar remains visually on “내 플래너” when Jira/Code Review applies Sprint filters (`JSX:273–313`), reducing location clarity. Native scrollbars may be hidden until scroll on macOS, making the internal cutoff easy to miss.
- **Change:** Use task titles around 14–15px and working metadata at least 11–12px with clear contrast. Move the short drag/keyboard alternative hint and source-state explanation above their boards. Prefer one primary scroll surface; otherwise expose visible overflow/remaining-task indicators. Give card-open and drag actions distinct affordances, and show the active source filter in the page context.
- **Acceptance:** At 1440×900 and 1280×800, a fresh user can read due dates and identify all five Thursday tasks, the next action, and the available movement method without hunting. At 125% zoom, content remains reachable and no controls overlap. Keyboard users can reschedule through the inspector without drag-and-drop.

## Verification checklist for the implementation owner

- [ ] Fresh local state: Today, Week, Month, Sprint screenshots at 1440×900; repeat core layout at 1280×800 and 125% zoom.
- [ ] Today: overdue/unfinished carryover, priorities, completed disclosure, due-today visibility, blocked explanation, open/close detail, keyboard focus return.
- [ ] Week: next/previous/current navigation, cross-week reschedule, original deadline preserved, capacity changes, drag alternative, no undiscoverable hidden tasks.
- [ ] Month: explicit read-only versus editable goal promise; selected goal and connected actions stay in context; correct calendar alignment.
- [ ] Sprint: local versus source status stated before mutation; blocked/review filters; selected-sprint add; rollover preview and Undo; review covers the full selected sprint.
- [ ] Recovery: create → edit title → reschedule → change estimate → complete → restore → archive/delete → Undo; validate reload persistence without whole-sample reset.
- [ ] Agenda: slot-add prefills time; overlap and after-hours warnings remain understandable; untimed work is accounted for and not mistaken as absent.
- [ ] Navigation: page/filter label matches sidebar action; date selection does not leak silently into other view's Add; main/detail/backlog scroll remains usable.
- [ ] Capture actual click/keyboard results separately from static screenshots. A passing build or screenshot alone is not live workflow evidence.

## Revised review — 2026-10-22

The five findings above preserve the initial review and are **not a claim that those defects all remain**. I re-inspected the current Today, Month, and Sprint screenshots and `/tmp/worklane-astra-week-refined.jpg`, plus the revised three source files. I performed no browser interactions. New source evidence below is from the approximately 1,951-line JSX / 370-line model / 3,231-line CSS revision; selectors and function names are more durable than line numbers during concurrent edits.

### What is now resolved or substantially improved

- Week/month period navigation, carryover visibility and rescheduling, editable monthly goals and linked next actions are present in source and screenshots.
- `sourceStatus` is separate from editable personal status. The Sprint summary now says “내 진행 상태 · 원본과 별도”, source status is read-only in Inspector, and deadline plus priority can coexist on a card.
- Personal title editing, archive/restore, default field Undo, period-specific review scopes, and separate reflection keys are implemented.
- Week's current day has a clear top edge. The refined screenshot visibly includes a clickable “아래에 더 있어요” overflow affordance, daily capacity/footer, and drag guidance within the first viewport. Task titles and metadata are materially more readable. Sidebar source-filter selection has also been corrected in source.
- The main agent additionally reports live verification of cross-week visibility; `TODO-15` carryover rescheduling to October 23 and Undo; completing `PAY-382` while preserving its original Jira status/deadline; field Undo with notes retained; personal rename/archive/restore and reload; November goal creation with criteria and a linked task plus reload; October/November scoped reviews and separate journals; a 200px overflow-button scroll; 10 passing model tests and a successful build. These are **main-agent-reported results, not independently repeated by this reviewer**.
- During this review, the main agent reports applying a selected-sprint backlog action that sets both the sprint and planned date, and removing the Sprint 25 no-op next-sprint action. My earlier read predated those edits; do not reopen those as outstanding defects without checking the new code.

### Remaining prioritized findings

**P2.1 — Collapse carryover by default in Today; keep its warning visible.**

- **Screenshot evidence:** A single carryover item occupies approximately y319–441 plus its lower margin. Priorities begin near y478, the 15:15 agenda item falls below the initial viewport, and inline Add/completed disclosure are no longer visible at 1440×900. In contrast, Week's compact carryover disclosure keeps planning actions visible.
- **Code inference:** Today inserts the complete `Carryover` before `.daily-layout` (`PlannerMock.jsx` around 540), and `Carryover` renders every missed item (`1625+`). There is no limit or collapse, so five or more leftovers can push almost all current-day work below the fold.
- **Targeted change:** Reuse a 36–40px disclosure summary such as “지난 계획에서 남은 일 1개 · 30분 · 다시 배치”. Keep count, age/urgency, and an expansion affordance visible; expand the existing controls only when requested. Do not hide the warning entirely or shrink task typography to reclaim the space.
- **Verify:** Fresh Today with one and five carryover items still exposes both priority tasks and the scheduled afternoon work; disclosure opens, date assignment works, and the summary count updates. The advisory brief being below the fold is not itself a blocker—the execution area being displaced is the material issue.

**P2.2 — Agenda does not reflect completion.**

- **Code inference:** `Agenda` selects all tasks with the date/time and always renders a work event with the label “집중”; it does not use `status` (`1548–1583`). Completing `PAY-382` removes it from the open task list but leaves its agenda card visually active.
- **Targeted change:** Preserve the scheduled record while giving completed items a checkmark and “완료” label with a subdued surface. Keep time accounting semantics unchanged unless separately specified.
- **Verify:** Complete/undo a scheduled task. List, agenda and completion count agree immediately, while the read-only original Jira status stays unchanged.

**P2.3 — 17:00 Add still looks like a time-slot action but creates an untimed task.**

- **Code inference:** The 17:00 `.agenda-free` button calls `quick(day)`. `quick` and `create` supply a date but no time (`202–225`, `1585–1597`). Changing its text to “할 일 추가” reduces the ambiguity but its position on the time axis still implies 17:00 placement.
- **Targeted change:** Either make this a non-clickable reserved-time block and use the general Add affordance, or pass `17:00` through a visible start-time field in creation. The smaller correction is the non-clickable reserved-time block.
- **Verify:** The affordance either cannot imply creation in that slot, or the created item visibly appears at 17:00 with a conflict/after-hours warning when applicable.

No additional P1 defect was found in this re-review. The three residual items are targeted consistency/usability corrections, not a request to expand scope or redesign the four views. Final 1280px and Sprint 25 creation verification remain with the main agent.

### Final targeted check

I inspected the refreshed `planner-today.jpg` and the formatted current source after the three targeted corrections:

- **P2.1 resolved by screenshot and source:** Today now has a roughly 38px closed carryover summary. All five open tasks, inline Add, completed disclosure, and the 15:15 scheduled task are visible in the 1440×900 capture. The warning remains discoverable and the expanded rescheduling controls remain in a native disclosure (`.daily-carryover`, current JSX:606–620).
- **P2.2 resolved in source:** `Agenda` now renders `done`, a checkmark and “완료” plus subdued/struck-through completed styling (`Agenda`, current JSX:1870–1910). The provided final screenshot is the fresh state, so the completed visual variant was not separately seen by this reviewer.
- **P2.3 resolved in source:** The 17:00 buffer is an informational `<div>` labeled “여유 시간”, with no creation handler (current JSX:1920–1925).
- **Sprint primary path verified in source:** The backlog's explicit button sets `sprint`, `date`, and appropriate `time` reset together, and labels both target sprint and date (current JSX:1171–1187). The main agent reports live verification that Sprint 25 quick-add defaults to November 2/Sprint 25 and that explicitly placing `TODO-14` puts it in that board.

**Alternate Sprint drag path — subsequently resolved in source:** While checking the alternate interaction, I found that draggable backlog cards could be dropped into Sprint 25 while the column handler patched only status. The main agent corrected the handler, and my final source read confirms `{ status, sprint }` plus an explicit selected-sprint/personal-status toast (current JSX:1078–1090). Personal planned date remains separate. **The native drag gesture and its Undo have not been exercised in this automation**; the explicit date/sprint buttons have main-agent-reported live verification.

**1280px visual check:** I also inspected `/tmp/worklane-astra-week-1280.jpg` and `/tmp/worklane-astra-inspector-1280.jpg`. The 1280×800 Week capture keeps day footers, overflow actions and movement guidance visible. With Inspector open, its labels and inputs are readable and original versus personal status is clearly separated. The board uses horizontal overflow at this width, with the fifth column partially outside the available canvas; the main agent identifies this as the intended layout. This reviewer inspected the saved pixels but did not independently exercise that scroll.

**Final bounded verdict:** No outstanding P1/P2 defect remains among the reviewed findings. The initial P1 blockers, three later targeted P2 items, and alternate Sprint drag handler have been addressed at the evidence level described above. The standalone desktop mock is ready for the main agent's handoff within its stated scope. This is not a production-readiness, accessibility-conformance, large-dataset, mobile, or external-integration claim. This reviewer has not independently exercised the UI or reload persistence; live evidence remains attributed to the main agent, and native drag gesture verification remains explicitly open.
