import nodemailer from 'nodemailer';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assertEmailConfigured(smtp) {
  const missing = ['host', 'user', 'pass', 'from', 'to'].filter((key) => !smtp[key]);
  if (missing.length) {
    throw new Error(`Email is not configured. Missing: ${missing.join(', ')}. Copy .env.example to .env.`);
  }
}

function transport(smtp) {
  assertEmailConfigured(smtp);
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
}

export async function sendAlert(smtp, posts, targetUsername) {
  const rows = posts.map((post) => `
    <li style="margin-bottom:16px">
      <a href="${escapeHtml(post.url)}">${escapeHtml(post.url)}</a>
      ${post.publishedAt ? `<br><small>Published: ${escapeHtml(post.publishedAt)}</small>` : ''}
      ${post.description ? `<br>${escapeHtml(post.description)}` : ''}
    </li>`).join('');

  await transport(smtp).sendMail({
    from: smtp.from,
    to: smtp.to,
    subject: `${posts.length} unliked Instagram post${posts.length === 1 ? '' : 's'} found`,
    text: `The checker found ${posts.length} unliked post(s) from @${targetUsername}:\n\n${posts.map((p) => p.url).join('\n')}`,
    html: `<p>The read-only checker found ${posts.length} post(s) from <strong>@${escapeHtml(targetUsername)}</strong> without your like.</p><ul>${rows}</ul>`,
  });
}

export async function sendAllClear(smtp, checked, targetUsername) {
  await transport(smtp).sendMail({
    from: smtp.from,
    to: smtp.to,
    subject: `Instagram check complete: no unliked posts found`,
    text: `Checked ${checked} post(s) from @${targetUsername}; none were unliked.`,
  });
}

export async function sendTestEmail(smtp) {
  await transport(smtp).sendMail({
    from: smtp.from,
    to: smtp.to,
    subject: 'Instagram like checker: test email',
    text: 'Your Instagram like checker email settings work.',
  });
}
