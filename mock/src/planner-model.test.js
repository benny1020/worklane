import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialTasks,
  capacity,
  moveTask,
  goalProgress,
  conflicts,
  TODAY,
  TOMORROW,
  shiftDate,
  shiftMonth,
  weekDays,
  monthPeriod,
  missedPlans,
  restorePlannerState,
  goalsForMonth,
  goalHealth,
  reviewTasks,
} from './planner-model.js';

test('one task moves between planning dates without duplicating or moving its source deadline', () => {
  const before = initialTasks();
  const after = moveTask(before, 'PAY-382', '2026-10-26');
  assert.equal(after.length, before.length);
  assert.equal(after.filter((t) => t.id === 'PAY-382').length, 1);
  const moved = after.find((t) => t.id === 'PAY-382');
  assert.equal(moved.due, TOMORROW);
  assert.equal(moved.sprint, '24');
  assert.equal(moved.date, '2026-10-26');
  assert.equal(moved.time, undefined);
  assert.equal(before.find((t) => t.id === 'PAY-382').date, TODAY);
});
test('workload includes completed work, meetings and interruption buffer without counting a task twice', () => {
  const before = initialTasks();
  assert.deepEqual(capacity(before, TODAY), {
    planned: 315,
    meetings: 90,
    available: 330,
    remaining: 15,
  });
  const moved = moveTask(before, 'PAY-291', TODAY);
  assert.equal(capacity(moved, TODAY).remaining, -75);
  assert.equal(capacity(moved, TOMORROW).planned, 75);
});
test('completion updates a monthly goal from the same task record', () => {
  const before = initialTasks();
  const old = goalProgress(before, 'payment');
  const completed = before.map((t) =>
    t.id === 'PAY-382' ? { ...t, status: 'done' } : t,
  );
  assert.deepEqual(goalProgress(completed, 'payment'), {
    all: old.all,
    done: old.done + 1,
  });
  assert.equal(
    capacity(completed, TODAY).planned,
    capacity(before, TODAY).planned,
  );
});
test('schedule flags overlapping meetings but allows adjacent task blocks', () => {
  const tasks = initialTasks();
  const t = tasks.find((t) => t.id === 'PAY-382');
  assert.equal(conflicts(tasks, t).length, 0);
  assert.equal(
    conflicts(tasks, { ...t, time: '14:00' }).some(
      (t) => t.title === '백엔드 설계 리뷰',
    ),
    true,
  );
  assert.equal(conflicts(tasks, { ...t, date: null }).length, 0);
});
test('weekends have no assumed working capacity', () => {
  assert.equal(capacity(initialTasks(), '2026-10-24').available, 0);
  assert.equal(
    capacity(moveTask(initialTasks(), 'PAY-382', '2026-10-24'), '2026-10-24')
      .remaining,
    -90,
  );
});

test('date navigation follows the selected week across month and year boundaries', () => {
  assert.deepEqual(
    weekDays('2027-01-01').map((d) => d.date),
    ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01'],
  );
  assert.equal(weekDays('2026-10-25')[0].date, '2026-10-19');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2026-01-31', 1), '2026-02-28');
  assert.equal(shiftMonth('2028-01-31', 1), '2028-02-29');
  assert.equal(monthPeriod('2028-02-20').count, 29);
  assert.equal(
    monthPeriod('2026-11-20').segments.reduce((n, s) => n + s.days, 0),
    30,
  );
});
test('missed plans remain discoverable and replanning moves one record without changing the original state', () => {
  const tasks = initialTasks();
  assert.deepEqual(
    missedPlans(tasks).map((t) => t.id),
    ['TODO-15'],
  );
  const prior = tasks.find((t) => t.id === 'TODO-15');
  const after = moveTask(tasks, prior.id, TODAY);
  assert.equal(missedPlans(after).length, 0);
  assert.equal(after.length, tasks.length);
  assert.equal(after.find((t) => t.id === prior.id).goal, prior.goal);
  assert.equal(
    after.find((t) => t.id === prior.id).sourceStatus,
    prior.sourceStatus,
  );
  assert.equal(missedPlans(moveTask(tasks, prior.id, null)).length, 0);
  assert.equal(missedPlans(tasks).length, 1);
});
test('v4 migration keeps saved tasks and notes while introducing goals and immutable source snapshots', () => {
  const tasks = initialTasks()
    .map(({ sourceStatus, ...t }) =>
      t.id === 'PAY-382'
        ? { ...t, status: 'done', date: '2026-11-03', notes: ['kept'] }
        : t,
    )
    .filter((t) => t.id !== 'TODO-15');
  const restored = restorePlannerState({
    version: 4,
    tasks,
    reflection: 'existing journal',
  });
  const changed = restored.tasks.find((t) => t.id === 'PAY-382');
  assert.equal(restored.tasks.length, tasks.length);
  assert.equal(changed.status, 'done');
  assert.equal(changed.sourceStatus, 'progress');
  assert.equal(changed.date, '2026-11-03');
  assert.deepEqual(changed.notes, ['kept']);
  assert.equal(restored.reflection, 'existing journal');
  assert.equal(restored.goals.length, 3);
  assert.equal(restored.focusDate, TODAY);
  const persisted = {
    ...restored,
    focusDate: '2026-11-03',
    goals: [
      {
        id: 'custom',
        title: 'Saved goal',
        startDate: '2026-11-01',
        due: '2026-11-30',
      },
    ],
    weekFocus: { '2026-11-02': 'Ship' },
  };
  assert.deepEqual(restorePlannerState(persisted), persisted);
});
test('monthly goals include overlapping periods and surface execution gaps from the shared tasks', () => {
  const goal = { id: 'order', startDate: '2026-10-05', due: '2026-10-30' };
  assert.equal(goalsForMonth([goal], '2026-10-22').length, 1);
  assert.equal(goalsForMonth([goal], '2026-11-22').length, 0);
  const spanning = { ...goal, due: '2026-11-03' };
  assert.equal(goalsForMonth([spanning], '2026-11-22').length, 1);
  const tasks = moveTask(initialTasks(), 'API-128', '2026-11-02');
  assert.deepEqual(goalHealth(tasks, goal), {
    open: 4,
    unplanned: 1,
    blocked: 0,
    late: 1,
  });
});
test('review scope follows the chosen day, week, month or sprint including undated sprint work', () => {
  const tasks = initialTasks();
  assert.equal(reviewTasks(tasks, 'today', '2026-10-26', '24').length, 1);
  assert.deepEqual(
    reviewTasks(tasks, 'week', '2026-10-26', '24').map((t) => t.id),
    ['PAY-399', 'PAY-410'],
  );
  const sprint = reviewTasks(tasks, 'sprint', TODAY, '24');
  assert.equal(
    sprint.some((t) => t.id === 'PAY-399'),
    true,
  );
  assert.equal(
    sprint.some((t) => t.id === 'API-145' && t.date === null),
    true,
  );
  assert.equal(
    sprint.some((t) => t.id === 'PAY-410'),
    false,
  );
  assert.equal(reviewTasks(tasks, 'month', '2026-11-22', '24').length, 0);
});
