import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';
import { config } from './config.js';
import { auditPosts, collectPostUrls, ensureAuthenticated } from './checker.js';
import { sendAlert, sendAllClear, sendTestEmail } from './email.js';
import { loadState, markNotified, mergeResults, saveState } from './state.js';

const args = new Set(process.argv.slice(2));

async function acquireLock() {
  await fs.mkdir(config.dataDir, { recursive: true });
  try {
    const handle = await fs.open(config.lockFile, 'wx');
    await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`);
    return handle;
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Another checker run is already active.');
    throw error;
  }
}

async function login() {
  await fs.mkdir(config.userDataDir, { recursive: true });
  const context = await chromium.launchPersistentContext(config.userDataDir, {
    headless: false,
    viewport: null,
    locale: 'en-US',
  });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(config.profileUrl, { waitUntil: 'domcontentloaded' });
  console.log('Sign in to Instagram in the opened Chromium window.');
  console.log('Confirm that you can see @michelle.apostolowski posts, then return here.');
  const terminal = readline.createInterface({ input, output });
  await terminal.question('Press Enter after login is complete... ');
  terminal.close();
  await ensureAuthenticated(page, config.profileUrl);
  await context.close();
  console.log('Login session saved locally.');
}

async function check() {
  const lock = await acquireLock();
  let context;
  try {
    const fullAudit = args.has('--full-audit');
    const limit = fullAudit ? config.fullAuditLimit : config.checkLimit;
    context = await chromium.launchPersistentContext(config.userDataDir, {
      headless: config.headless,
      locale: 'en-US',
    });
    const page = context.pages()[0] ?? await context.newPage();
    await ensureAuthenticated(page, config.profileUrl);

    console.log(`Collecting up to ${limit} post links from @${config.targetUsername}...`);
    const urls = await collectPostUrls(page, config.profileUrl, limit, config);
    if (urls.length === 0) throw new Error('No post links were visible. The profile may be unavailable or the page layout may have changed.');

    const results = await auditPosts(page, urls, config, (result, current, total) => {
      console.log(`[${current}/${total}] ${result.status.padEnd(7)} ${result.url}`);
    });
    const state = await loadState(config.stateFile);
    const { next, notify } = mergeResults(state, results, { reminderDays: config.reminderDays });
    const unlikedCount = results.filter((result) => result.status === 'unliked').length;
    const unknownCount = results.filter((result) => result.status === 'unknown').length;
    const dailyAllClear = !fullAudit && unlikedCount === 0 && unknownCount === 0;
    const configuredAllClear = fullAudit && config.notifyOnAllClear && unlikedCount === 0 && unknownCount === 0;

    if (notify.length > 0) {
      await sendAlert(config.smtp, notify, config.targetUsername);
      markNotified(next, notify);
      console.log(`Email sent for ${notify.length} unliked post(s).`);
    } else if (dailyAllClear || configuredAllClear) {
      await sendAllClear(config.smtp);
      console.log('All-clear email sent.');
    } else if (unknownCount > 0) {
      console.log(`No email sent because ${unknownCount} post(s) could not be classified safely.`);
    } else if (unlikedCount > 0) {
      console.log('Unliked posts remain, but they were already reported; no duplicate email sent.');
    } else {
      console.log('No unliked posts found; full-audit all-clear email is disabled.');
    }

    await saveState(config.stateFile, next);
    const counts = results.reduce((summary, result) => {
      summary[result.status] = (summary[result.status] ?? 0) + 1;
      return summary;
    }, {});
    console.log(`Done. liked=${counts.liked ?? 0}, unliked=${counts.unliked ?? 0}, unknown=${counts.unknown ?? 0}`);
  } finally {
    if (context) await context.close();
    await lock.close();
    await fs.unlink(config.lockFile).catch(() => {});
  }
}

async function main() {
  if (args.has('--login')) return login();
  if (args.has('--test-email')) {
    await sendTestEmail(config.smtp);
    console.log('Test email sent.');
    return;
  }
  return check();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
