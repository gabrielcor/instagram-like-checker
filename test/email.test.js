import test from 'node:test';
import assert from 'node:assert/strict';
import { allClearMessage } from '../src/email.js';

test('daily all-clear email uses the requested Spanish wording', () => {
  assert.deepEqual(allClearMessage, {
    subject: 'Instagram like checker: no hay posts sin like',
    text: 'Revisé los últimos posts y no hay nada sin like.',
  });
});
