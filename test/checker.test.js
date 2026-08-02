import test from 'node:test';
import assert from 'node:assert/strict';
import { isPostPath } from '../src/checker.js';

test('recognizes legacy Instagram post paths', () => {
  assert.equal(isPostPath('/p/ABC123/'), true);
  assert.equal(isPostPath('/reel/ABC123/'), true);
});

test('recognizes owner-prefixed Instagram post paths', () => {
  assert.equal(isPostPath('/michelle.apostolowski/p/ABC123/'), true);
  assert.equal(isPostPath('/michelle.apostolowski/reel/ABC123/'), true);
});

test('rejects profile, story, and unrelated paths', () => {
  assert.equal(isPostPath('/michelle.apostolowski/'), false);
  assert.equal(isPostPath('/stories/highlights/123/'), false);
  assert.equal(isPostPath('/accounts/login/'), false);
});
