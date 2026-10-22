# Astra planning implementation · 2026-10-22

Scope: `mock/src/PlannerMock.jsx`, `mock/src/planner-model.js`, and its model tests only. No frontend-design skill, external API, source-state write, git commit, or browser automation was used. Screenshot review used the existing week and month JPGs. The implementation keeps the fixed sample clock of October 22 for repeatable evaluation.

## 1. Make planning continue beyond the current screen

A shared selected date now drives day, week, month, quick add, backlog placement, and the relevant review scope. Week/month have previous, current, and next controls; a weekday heading opens the same day's work. Month geometry is calculated from the actual number of days and week boundaries. Empty future months provide a concrete first-goal action. The selected date is saved locally.

The weekly direction is editable per Monday and saved. The capacity summary counts spare time only on today and upcoming weekdays in the selected week; past free hours are not presented as capacity that can still be used. Overloaded days remain separately visible.

Daily, weekly, monthly, and sprint review use distinct sets of the same task records and have separately stored reflections. Sprint review includes undated and next-week sprint tasks. Creating from a sprint preselects its membership and a date within that sprint.

## 2. Keep unfinished plans discoverable

Today and current/future week display open tasks planned before the fixed sample today. Each retains its original planned date until the user explicitly moves it, can be opened, assigned to a chosen date, or returned to the planning inbox. The date row previews remaining capacity after the proposed move. Moving uses the existing task ID, clears stale time assignments, preserves source deadline/status and goal/sprint, and offers Undo.

`TODO-15`, a 30-minute open task from October 21, makes this recovery flow visible in a fresh/reset sample. Existing stored task collections are preserved without silently inserting the new sample task.

## 3. Turn monthly outcomes into editable plans

Monthly goals can be created and edited with a title, success criteria, start date, target date, and milestone. They are stored locally. Cross-month goals appear in every overlapping month. Their timeline is clipped to that month.

Next actions prioritize undated work and blocked work instead of hiding them after the first two records. Each goal shows its remaining, unplanned, blocked, and planned-after-target counts. Users can assign a date inline, inspect all remaining tasks, and add a new action already linked to that goal. The task inspector and task creation dialog can change the goal link. These remain the same tasks used by every other view.

## Source-state clarity

`sourceStatus` is a read-only sample snapshot distinct from editable personal `status`. The inspector labels both explicitly. Existing v4 data is migrated without losing task edits, notes, original journal, goals, or weekly direction; known connected source states are taken from the original fixture rather than the user's changed personal status. Card priority and original deadline are both shown. Sprint summary identifies the board as personal progress.

## Verification

- `node --test mock/src/planner-model.test.js`: 10/10 pass.
- `npm run build --prefix mock`: pass.
- React server rendering: day/week/month/sprint × current October date/future November date, 8 combinations pass. This verifies runtime rendering and future-period empty states, not interactive behavior.
- Root owns browser checks and screenshot capture; none is claimed here.

New tests cover year/month/leap-day navigation; missed-plan recovery and record identity; preserving v4 state while adding source snapshots; overlapping monthly goals and execution gaps; and correct review scopes.

## Remaining boundaries

Meeting data and working-hour defaults remain sample fixtures. Week view is a five-weekday board; weekend tasks remain accessible in daily/month review and task detail. Sprint choices remain the two supplied sample periods. There is no live source synchronization. Single-step Undo is the existing model, not a full history. General task-title editing/removal and Undo for every individual inspector field are delegated to root follow-up, not claimed in this implementation.
