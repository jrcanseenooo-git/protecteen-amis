# AMIS Hybrid Setup Audit

## Recommended Setup

Use Vercel for the public frontend and domain, and keep Apps Script as
the production backend.

Request flow:

```text
Browser -> Vercel static frontend -> /api/rpc -> Apps Script -> Google Sheets
```

This preserves the working Apps Script business logic while removing
the public Apps Script URL from users.

## Current Optimizations

- `/api/rpc` proxies to Apps Script in production.
- `FORCE_LOCAL_BACKEND=1` is local-only and uses ported Node handlers
  first, then falls back to Apps Script for unported functions.
- Read-only proxied calls have a short cache controlled by
  `APPS_SCRIPT_READ_CACHE_TTL_MS`.
- Dashboard polling is reduced from 3 seconds to 30 seconds.
- Dashboard stat reloads are throttled to once per minute unless forced.
- Polling pauses while the browser tab is hidden.
- Barangay lists load once per session instead of on every dashboard
  stats refresh.
- Barangay stats are no longer preloaded for every barangay on login.

## Main Flaws To Watch

- Apps Script and Google Sheets are still the performance bottleneck.
- Large modules that read whole sheets can feel slow during first load.
- Client sessions still carry role/region data from the browser, matching
  the original Apps Script behavior. A hardened backend should re-read
  role and region from the users sheet.
- In-memory Vercel caching is opportunistic. It helps, but serverless
  instances can recycle at any time.
- Google Sheets is not ideal for high-concurrency writes. It is fine for
  moderate internal workflows, but heavy simultaneous use should move
  writes to a database.

## Future Improvements

- Add Apps Script `CacheService` to expensive read functions.
- Batch sheet reads inside Apps Script and avoid repeated `getDataRange`
  calls in one request.
- Return smaller payloads for table views with server-side pagination.
- Add explicit last-updated timestamps per module instead of using one
  shared change timestamp check.
- Harden session validation server-side before exposing more write
  endpoints through Vercel.
- Move signatures to Drive file storage if raw base64 cell values become
  too large for Google Sheets.
