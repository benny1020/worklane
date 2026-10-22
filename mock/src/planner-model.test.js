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
