import test from 'node:test';
import assert from 'node:assert/strict';
import { allClearMessage, emailRecipients } from '../src/email.js';

test('daily all-clear email uses the requested Spanish wording', () => {
  assert.deepEqual(allClearMessage, {
    subject: 'Instagram like checker: no hay posts sin like',
    text: 'Revisé los últimos posts y no hay nada sin like.',
  });
});

test('includes a configured CC recipient in email messages', () => {
  assert.deepEqual(emailRecipients({
    from: 'sender@example.com',
    to: 'primary@example.com',
    cc: 'copy@example.com',
  }), {
    from: 'sender@example.com',
    to: 'primary@example.com',
    cc: 'copy@example.com',
  });
});

test('omits CC when it is not configured', () => {
  assert.deepEqual(emailRecipients({
    from: 'sender@example.com',
    to: 'primary@example.com',
  }), {
    from: 'sender@example.com',
    to: 'primary@example.com',
  });
});
