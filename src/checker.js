const POST_PATH = /^\/(p|reel)\/[^/]+\/?$/;

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function politePause(page, min, max) {
  await page.waitForTimeout(randomBetween(min, max));
}

export async function ensureAuthenticated(page, profileUrl) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const loginLinks = await page.locator('a[href*="/accounts/login/"]').count();
  const loginForm = await page.locator('input[name="username"]').count();
  if (page.url().includes('/accounts/login/') || loginLinks > 0 || loginForm > 0) {
    throw new Error('AUTH_REQUIRED: Run "npm run login" and sign in manually.');
  }
}

export async function collectPostUrls(page, profileUrl, limit, config) {
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const found = new Set();
  let noGrowthRounds = 0;

  while (found.size < limit && noGrowthRounds < 3) {
    const before = found.size;
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('main a[href]')]
        .map((anchor) => anchor.getAttribute('href'))
        .filter(Boolean)
        .slice(0, 300),
    );

    for (const href of links) {
      const url = new URL(href, 'https://www.instagram.com');
      if (url.hostname === 'www.instagram.com' && POST_PATH.test(url.pathname)) {
        found.add(`${url.origin}${url.pathname}`);
      }
      if (found.size >= limit) break;
    }

    noGrowthRounds = found.size === before ? noGrowthRounds + 1 : 0;
    if (found.size >= limit) break;

    const atBottom = await page.evaluate(() => {
      const root = document.documentElement;
      const beforeY = window.scrollY;
      window.scrollBy(0, Math.max(window.innerHeight * 0.85, 800));
      return beforeY + window.innerHeight >= root.scrollHeight - 8;
    });
    await politePause(page, config.minScrollDelayMs, config.maxScrollDelayMs);
    if (atBottom && noGrowthRounds >= 1) noGrowthRounds += 1;
  }

  return [...found].slice(0, limit);
}

export async function inspectPost(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 20_000 });

  const result = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
    };

    const icons = [...document.querySelectorAll(
      'main article svg[aria-label="Like"], main article svg[aria-label="Unlike"]',
    )].filter((icon) => visible(icon) && !icon.closest('li, header, nav'));

    const labels = [...new Set(icons.map((icon) => icon.getAttribute('aria-label')))];
    const time = document.querySelector('main article time[datetime]');
    const description = document.querySelector('meta[property="og:description"]');

    let status = 'unknown';
    if (labels.length === 1 && labels[0] === 'Unlike') status = 'liked';
    if (labels.length === 1 && labels[0] === 'Like') status = 'unliked';

    return {
      status,
      publishedAt: time?.getAttribute('datetime') ?? null,
      description: description?.getAttribute('content')?.slice(0, 240) ?? null,
      evidence: labels,
    };
  });

  return { url, ...result };
}

export async function auditPosts(page, urls, config, onResult = () => {}) {
  const results = [];
  for (let index = 0; index < urls.length; index += 1) {
    if (index > 0) {
      await politePause(page, config.minPostDelayMs, config.maxPostDelayMs);
    }
    try {
      const result = await inspectPost(page, urls[index]);
      results.push(result);
      onResult(result, index + 1, urls.length);
    } catch (error) {
      const result = {
        url: urls[index],
        status: 'unknown',
        publishedAt: null,
        description: null,
        evidence: [],
        error: error.message,
      };
      results.push(result);
      onResult(result, index + 1, urls.length);
    }
  }
  return results;
}
