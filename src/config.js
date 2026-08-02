import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function integer(name, fallback, minimum = 0) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return value;
}

function bool(name, fallback) {
  const raw = (process.env[name] ?? String(fallback)).toLowerCase();
  if (['true', '1', 'yes'].includes(raw)) return true;
  if (['false', '0', 'no'].includes(raw)) return false;
  throw new Error(`${name} must be true or false.`);
}

const targetUsername = process.env.TARGET_USERNAME ?? 'michelle.apostolowski';
if (targetUsername !== 'michelle.apostolowski') {
  throw new Error('This build is restricted to TARGET_USERNAME=michelle.apostolowski.');
}

const minPostDelayMs = integer('MIN_POST_DELAY_MS', 4500, 3000);
const maxPostDelayMs = integer('MAX_POST_DELAY_MS', 8000, minPostDelayMs);
const minScrollDelayMs = integer('MIN_SCROLL_DELAY_MS', 2500, 1500);
const maxScrollDelayMs = integer('MAX_SCROLL_DELAY_MS', 4500, minScrollDelayMs);

export const config = {
  targetUsername,
  profileUrl: `https://www.instagram.com/${targetUsername}/`,
  checkLimit: integer('CHECK_LIMIT', 12, 1),
  fullAuditLimit: integer('FULL_AUDIT_LIMIT', 250, 1),
  headless: bool('HEADLESS', true),
  minPostDelayMs,
  maxPostDelayMs,
  minScrollDelayMs,
  maxScrollDelayMs,
  reminderDays: integer('REMINDER_DAYS', 0, 0),
  notifyOnAllClear: bool('NOTIFY_ON_ALL_CLEAR', false),
  dataDir: path.resolve(projectRoot, 'data'),
  userDataDir: path.resolve(projectRoot, 'data', 'chromium-profile'),
  stateFile: path.resolve(projectRoot, 'data', 'state.json'),
  lockFile: path.resolve(projectRoot, 'data', 'run.lock'),
  smtp: {
    host: process.env.SMTP_HOST,
    port: integer('SMTP_PORT', 465, 1),
    secure: bool('SMTP_SECURE', true),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
    to: process.env.EMAIL_TO,
  },
};
