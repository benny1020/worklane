# Worklane planner — visual design pass

Scope: `mock/src/planner.css` only. Reviewed the four supplied 1440 × 900 planner screenshots and the current JSX. No frontend-design skill, browser automation, application source edits, commits, or pushes were used in this pass.

## Findings and changes

- **Working information was too faint and small.** Task names are now 14px in Today and Sprint, 13px in Week. Card source and duration metadata are 11px. Neutral dark green text replaces the low-contrast pale green throughout planning controls, tasks, agenda details, milestones, and inspectors. Heading scale remains compact at 25px/18px/13px.
- **Week hid work without an adequate scroll signal.** The task area now has a stable thin scrollbar, top/bottom scroll shadows, a bounded viewport-relative height, and separated column footers. The current day has a darker date, green top rule, and light green column. A task card retains its full title, rather than being line-clamped.
- **The monthly roadmap consumed too much of the viewport.** Goal rows shrink from 105px to 87px while task and goal names become more legible. The milestone column and next-action rows use the same type hierarchy. The dynamic roadmap geometry supplied by the planning agent remains authoritative through its inline styles.
- **The sprint board needed clearer scanning.** Column labels and count chips are stronger, sticky while scrolling, and cards use consistent metadata spacing. Blocked cards receive a narrow amber edge and clear text. The summary remains a compact strip.
- **New planning actions need a coherent visual language.** Added styles for period navigation, editable weekly direction, remaining capacity, carryover rows with capacity forecasts, goal scheduling/editing, title editing, and archive/restore actions. Inputs remain inline with the work they affect.

## Selectors

- Shared hierarchy: `.page-heading`, `.viewbar`, `.section-top`, `.task-info`, `.source`, `.task-time`, `.button`.
- Today: `.task-row`, `.day-overview`, `.agenda-event`, `.agenda-row`, `.brief`.
- Week: `.week-day`, `.day-open`, `.week-task-list`, `.task-card`, `.card-title`, `.card-bottom`, `.week-completed`, `.week-footer`.
- Month: `.roadmap-row`, `.roadmap-name`, `.roadmap-bar`, `.goal-detail`, `.goal-task-main`, `.goal-date`, `.goal-health`, `.goal-detail-actions`, `.milestones`.
- Sprint: `.sprint-summary`, `.sprint-board > section > h3`, `.sprint-board .card-title`.
- New actions: `.period-controls`, `.period-actions`, `.week-focus`, `.week-capacity`, `.carryover-panel`, `.carryover-task`, `.carryover-actions`, `.goal-form-field`, `.task-title-editor`, `.archive-actions`, `.archived-tasks`.

## Verification and remaining checks

- PostCSS successfully parsed the stylesheet (652 top-level nodes at this checkpoint).
- Representative small-text contrast calculations: task metadata `#62745b` on white **5.04:1**, week meetings `#5f6d88` on `#fafbf8` **5.02:1**, current-day text `#637559` on `#f1f6ec` **4.53:1**. This is a targeted check, not a full accessibility audit.
- Root's intermediate Today screenshot confirmed stronger readability. That screenshot showed the brief beginning near the bottom edge; subsequent CSS tightened task-row vertical padding from 10px to 7px and internal title/meta gap from 7px to 5px, without reducing type sizes.
- Final browser checks belong to root after JSX settles. Check Week's 5-item Thursday column, 1200px layout, open inspector, carryover rows, and monthly inline date fields. Newly added carryover content legitimately increases page height; it should remain reviewable rather than compressed into tiny controls.
- Optional JSX enhancement: expose a real overflow-aware “more tasks below” hint for Week if the scroll shadows are too subtle in the final browser. CSS alone cannot reliably calculate the hidden task count. The existing total count and scroll area are retained.

No production readiness or persistence claims are made by this visual pass.

## Second pass — Week viewport fit

The actual intermediate `/tmp/worklane-astra-week-current.jpg` showed the board starting at y≈334, with the column footers beginning at y≈857 underneath the application footer. The previous list-height calculation accounted for the original header, not the new weekly direction and capacity controls.

- Bound the whole board to `clamp(420px, calc(100dvh - 380px), 680px)`, then let `.week-task-area` consume the space left by the header, meetings, and footer. The task list now takes 100% of that remaining space.
- Put weekly direction and capacity on one row at the target desktop width. Meetings retain their type sizes while time and title share a line. Task card padding and inter-line spacing shrink by 2–3px; card fonts remain unchanged.
- Styled root's actual overflow-aware `.week-scroll-hint` button inside `.week-task-area`. The hint is actionable and appears only when the root's ResizeObserver/scroll logic reports hidden content.
- Styled root's collapsed `.week-carryover` disclosure and subtract another 40px from the board when that disclosure exists. Expanded carryover uses page scrolling, preserving its readable replanning controls.
- Parsing after this pass: **681 top-level CSS nodes**. `git diff --check` passed.
- Inspected root's fresh `/tmp/worklane-astra-week-refined.jpg` at **1440 × 900**. With one collapsed carryover row, the board ends at y≈826 and the drag/alternative-date guidance remains visible at y≈845. All five column footers are visible above the application footer. Thursday and Friday expose the actual overflow hint; task type remains readable. This verifies the target viewport fit. Root retains interaction checks and the 1280px/other-view regression pass.
