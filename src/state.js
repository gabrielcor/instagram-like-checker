import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadState(file) {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return { version: 1, posts: {}, ...parsed };
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, posts: {} };
    throw error;
  }
}

export async function saveState(file, state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
}

function reminderDue(previous, now, reminderDays) {
  if (!previous?.notifiedAt) return true;
  if (reminderDays === 0) return false;
  const elapsed = now.getTime() - new Date(previous.notifiedAt).getTime();
  return elapsed >= reminderDays * 86_400_000;
}

export function mergeResults(state, results, options = {}) {
  const now = options.now ?? new Date();
  const reminderDays = options.reminderDays ?? 0;
  const notify = [];
  const next = structuredClone(state);
  next.lastRunAt = now.toISOString();

  for (const result of results) {
    const previous = next.posts[result.url];
    const becameUnliked = result.status === 'unliked' && previous?.status !== 'unliked';
    const shouldRemind = result.status === 'unliked' && reminderDue(previous, now, reminderDays);
    if (becameUnliked || shouldRemind) notify.push(result);

    next.posts[result.url] = {
      firstSeenAt: previous?.firstSeenAt ?? now.toISOString(),
      lastCheckedAt: now.toISOString(),
      status: result.status,
      publishedAt: result.publishedAt,
      description: result.description,
      notifiedAt: previous?.notifiedAt ?? null,
    };
  }

  return { next, notify };
}

export function markNotified(state, posts, now = new Date()) {
  for (const post of posts) {
    if (state.posts[post.url]) state.posts[post.url].notifiedAt = now.toISOString();
  }
  return state;
}
