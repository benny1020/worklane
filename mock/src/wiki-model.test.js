import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialWikiState,
  saveWikiDraft,
  publishWikiDraft,
  discardWikiDraft,
  searchPages,
  pageAncestors,
  createWikiPage,
  restoreWikiState,
  TEMPLATES,
} from './wiki-model.js';

test('draft autosave leaves the published page and history unchanged', () => {
  const state = initialWikiState();
  const before = structuredClone(
    state.pages.find((p) => p.id === 'retry-policy'),
  );
  const next = saveWikiDraft(state, before.id, {
    title: '개선한 정책',
    content: TEMPLATES.spec.content,
  });
  assert.deepEqual(
    next.pages.find((p) => p.id === before.id),
    before,
  );
  assert.equal(next.drafts[before.id].title, '개선한 정책');
  assert.deepEqual(restoreWikiState(JSON.parse(JSON.stringify(next))), next);
});
test('publishing produces an immutable revision and preserves other drafts and comments', () => {
  let state = initialWikiState();
  const before = structuredClone(
    state.pages.find((p) => p.id === 'retry-policy'),
  );
  state = saveWikiDraft(state, before.id, {
    title: '새 정책',
    content: TEMPLATES.runbook.content,
  });
  const next = publishWikiDraft(state, before.id, '운영 절차 보완');
  const page = next.pages.find((p) => p.id === before.id);
  assert.equal(page.version, 5);
  assert.equal(page.title, '새 정책');
  assert.equal(page.versions[0].note, '운영 절차 보완');
  assert.deepEqual(page.versions[1].content, before.content);
  assert.equal(next.drafts[before.id], undefined);
  assert.deepEqual(next.drafts['retry-adr'], state.drafts['retry-adr']);
  assert.deepEqual(next.comments, state.comments);
});
test('empty titles cannot publish or consume a draft', () => {
  const state = saveWikiDraft(initialWikiState(), 'retry-policy', {
    title: '  ',
    content: TEMPLATES.blank.content,
  });
  assert.equal(publishWikiDraft(state, 'retry-policy'), state);
});
test('discarding a published-page draft preserves the published document and revision history', () => {
  const original = initialWikiState();
  const draft = saveWikiDraft(original, 'retry-policy', {
    title: '미게시 변경',
    content: TEMPLATES.blank.content,
  });
  const next = discardWikiDraft(draft, 'retry-policy');
  assert.deepEqual(next.pages, original.pages);
  assert.equal(next.drafts['retry-policy'], undefined);
  assert.deepEqual(next.drafts['retry-adr'], original.drafts['retry-adr']);
});
test('new template pages are private drafts until explicit publication', () => {
  const { state, id } = createWikiPage(initialWikiState(), {
    title: '운영 가이드',
    space: 'pay',
    parent: 'payments-guide',
    template: 'runbook',
  });
  const page = state.pages.find((p) => p.id === id);
  assert.equal(page.published, false);
  assert.equal(page.version, 0);
  assert.equal(page.parent, 'payments-guide');
  assert.ok(state.drafts[id]);
  const published = publishWikiDraft(state, id);
  assert.equal(published.pages.find((p) => p.id === id).version, 1);
});
test('search matches title, content and labels within the chosen space', () => {
  const state = initialWikiState();
  assert.ok(
    searchPages(state, '트랜잭션').some((p) => p.id === 'retry-policy'),
  );
  assert.equal(searchPages(state, '멱등성 키 설계')[0].id, 'idempotency');
  assert.equal(searchPages(state, '트랜잭션', 'api').length, 0);
  assert.ok(
    searchPages(state, 'payments 멱등성').some((p) => p.id === 'idempotency'),
  );
});
test('breadcrumbs retain hierarchy and tolerate invalid cyclic imported parents', () => {
  const state = initialWikiState();
  const page = state.pages.find((p) => p.id === 'retry-policy');
  assert.deepEqual(
    pageAncestors(state.pages, page).map((p) => p.id),
    ['payments-guide'],
  );
  const cyclic = [
    { id: 'a', parent: 'b' },
    { id: 'b', parent: 'a' },
  ];
  assert.deepEqual(
    pageAncestors(cyclic, cyclic[0]).map((p) => p.id),
    ['b'],
  );
});
