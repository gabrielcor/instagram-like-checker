# Instagram Like Checker

This is a deliberately narrow, read-only checker for posts from
`@michelle.apostolowski`. It uses a normal persistent Playwright Chromium
profile, does not disguise automation, and never clicks Instagram's Like or
Unlike controls.

It has two modes:

- `npm run audit` slowly checks historical posts (up to `FULL_AUDIT_LIMIT`).
- `npm run dailyaudit` checks only the newest 12 visible posts and emails you only
  when it sees an unliked post that it has not already reported.
- `npm run check` is retained as an alias for the same daily workflow.

Instagram does not provide a supported consumer API for this exact check, so
page changes can require updating the detector. Any browser automation may also
carry account or Terms-of-Use risk. Keep the schedule low-frequency.

## 1. Install

Open PowerShell in this folder and run:

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Edit `.env`. For Gmail, enable two-step verification and create a Google App
Password for `SMTP_PASS`; do not use your normal Google password.

## 2. Save your Instagram login

```powershell
npm run login
```

A dedicated Chromium window opens. Log in yourself and confirm that the private
target profile's posts are visible. Return to PowerShell and press Enter. The
session is saved only under `data/chromium-profile` on this computer.

Do not copy that folder or commit it to source control—it contains an active
Instagram session.

## 3. Verify email and perform the initial audit

```powershell
npm run test-email
npm run audit
```

The audit is intentionally slow. It reports posts whose state it can identify
as unliked. A post is marked `unknown` rather than guessed if Instagram's page
does not expose an unambiguous Like/Unlike control.

## 4. Schedule a daily check

To try the same review that the scheduled task will perform:

```powershell
npm run dailyaudit
```

By default it checks the newest 12 visible posts. Change `CHECK_LIMIT` in
`.env` if you want a different daily limit.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-task.ps1 -DailyTime "09:15"
```

The Windows task runs only while your user is logged in. To remove it:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-task.ps1
```

## Useful settings

- `CHECK_LIMIT=12`: number of newest visible posts checked each day.
- `FULL_AUDIT_LIMIT=250`: maximum number checked by `npm run audit`.
- `REMINDER_DAYS=0`: do not repeat alerts for a continuously-unliked post.
- `NOTIFY_ON_ALL_CLEAR=true`: also email after runs that find nothing new.
- `HEADLESS=false`: show the scheduled browser while troubleshooting.

The state file is `data/state.json`. Email credentials and the login profile are
excluded by `.gitignore`.
