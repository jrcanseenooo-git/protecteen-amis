# AMIS Security and Deployment Rules

These rules are project policy. Check this file before local testing, Apps Script edits, or Vercel deployment.

## Apps Script Deployment

- Do not create a new Apps Script web app URL for routine updates.
- Use the existing Apps Script deployment and manage/edit that deployment.
- Use clear deployment version names such as `AMIS_v2`, `AMIS_v3`, and so on.
- Keep `APPS_SCRIPT_WEB_APP_URL` pointed at the one approved deployment URL.

## Required Checks Before Deploy

- Run `npm run deploy:check` before every local or live deploy.
- `npm run deploy:check` runs:
  - `npm audit --audit-level=high`
  - `npm run build`
- Patch high-severity dependency issues before deploying.
- Keep dependencies current, especially Vercel/runtime dependencies.

## Error Handling

- Log detailed errors privately on the server side only.
- Show users generic error messages.
- Never expose stack traces, raw exception text, secrets, tokens, spreadsheet IDs, or deployment URLs in browser messages.
- Frontend messages should say what the user can do next, not reveal internals.

## Secrets

- Move all secrets server-side.
- Use environment variables for secrets.
- Secrets must never touch the browser, `public/`, frontend JavaScript, HTML, or CSS.
- Keep `.env`, service account files, keys, and credentials out of git.
- Use `.env.example` only for empty/non-sensitive variable names.

## Redirects and URLs

- Redirect only to paths on an allowlist.
- Reject absolute URLs unless they are controlled by this project.
- Whitelist only owned/approved AMIS domains.
- Do not accept user-controlled redirect targets.

## CORS

- Never use wildcard CORS in local or production.
- Allow only approved AMIS origins/domains.
- Keep local origins explicit, for example `http://127.0.0.1:3000`.

## Rate Limiting

- Add rate limiting middleware before public deployment.
- Auth routes must allow at most 5 attempts per minute per IP.
- Failed login/signup/password attempts should be logged privately.
- Do not reveal whether an email exists during auth failures.

## Deployment Decision Rule

- If smoke tests fail, do not deploy.
- If a module is not verified locally, treat it as not production-ready.
- Keep the existing Apps Script-hosted system as the safe fallback until the Vercel setup passes smoke testing.
