import test from 'node:test';
import assert from 'node:assert/strict';
import { markNotified, mergeResults } from '../src/state.js';

const post = { url: 'https://www.instagram.com/p/example/', status: 'unliked', publishedAt: null, description: null };

test('a newly discovered unliked post triggers one notification', () => {
  const now = new Date('2026-08-02T12:00:00Z');
  const first = mergeResults({ version: 1, posts: {} }, [post], { now, reminderDays: 0 });
  assert.equal(first.notify.length, 1);
  markNotified(first.next, first.notify, now);

  const second = mergeResults(first.next, [post], {
    now: new Date('2026-08-03T12:00:00Z'),
    reminderDays: 0,
  });
  assert.equal(second.notify.length, 0);
});

test('a liked-to-unliked transition triggers a fresh notification', () => {
  const state = {
    version: 1,
    posts: {
      [post.url]: {
        firstSeenAt: '2026-08-01T12:00:00Z',
        lastCheckedAt: '2026-08-01T12:00:00Z',
        status: 'liked',
        notifiedAt: null,
      },
    },
  };
  const result = mergeResults(state, [post], { now: new Date('2026-08-02T12:00:00Z') });
  assert.equal(result.notify.length, 1);
});
