# AMIS on Vercel — Google Sheet as the database

This is the same AMIS frontend (same Vuetify 3 + Vue files, same views,
same buttons, same business logic) running on Vercel instead of Apps
Script, still reading/writing the same Google Spreadsheet.

## What actually changed, file by file

Nothing in the design, the Vue components, the validation rules, the
AMVAT scoring, the dashboard math, or any button/view was touched.
Three purely mechanical things had to change because they're things
Apps Script provides that don't exist anywhere else:

1. **`index.html`** — the two `<?!= include(...) ?>` scriptlets (Apps
   Script's templating syntax) were swapped for plain `<link>` /
   `<script>` tags pointing at `style.css` and `app.js`. The
   `ongoing_dev.html` snippet got inlined at the same spot it was
   already being inlined into, just at build time instead of by Apps
   Script at request time. Every other line is untouched.
2. **`style.html` → `style.css`** and **`script.html` → `app.js`** —
   only the outer `<style>`/`<script>` wrapper tags were stripped (a
   `.css` file can't have `<style>` tags around it). The CSS and the
   Vue app code inside are byte-for-byte identical.
3. **One new file, `google-script-shim.js`** — recreates the
   `google.script.run.withSuccessHandler(...).someFunction(...)` API
   that Apps Script normally injects into the page, routing it to
   `/api/rpc` instead of Google's internal RPC channel. Because of
   this, **`app.js` itself didn't need a single line changed** — every
   existing call site keeps working exactly as written.

Everything else is new *additions* (the `/api` and `/lib` and
`/handlers` folders) — nothing pre-existing was rewritten beyond the
three points above.

## Project structure

```
public/
  index.html              # unchanged markup, swapped includes for tags
  style.css                # = style.html, tags stripped
  app.js                    # = script.html, tags stripped
  google-script-shim.js     # new: google.script.run polyfill
api/
  rpc.js                    # single endpoint the shim calls
lib/
  sheetsClient.js           # Sheets API wrapper shaped like SpreadsheetApp
  auth.js                   # checkSessionAndGetUser, logActivity, lockout helpers
  crypto.js                 # hashPassword (same SHA-256+salt as Apps Script)
  settings.js               # = Code.gs's SETTINGS object, copied verbatim
handlers/
  login.js, signup.js, checkSession.js   # ported Code.gs functions, one file each
```

## Keeping credentials out of git

`.gitignore` is set up to block:
- `.env` and any `.env.*` variant (the template `.env.example` is the
  one deliberate exception, since it has no real values in it)
- Service-account / key files, however they're named (`*-key.json`,
  `*credentials*.json`, `*.pem`, etc.)
- `.vercel/` (Vercel CLI's local project-link folder)

For anything sensitive added later, drop it into the `secrets/`
folder — everything in there is ignored automatically (a `.gitkeep`
keeps the empty folder itself tracked so it stays part of the repo
structure). That's the reliable option: a new file type or naming
convention isn't guaranteed to match by name, but anything physically
inside `secrets/` is guaranteed to never be committed.

If a sensitive file was ever committed *before* this `.gitignore`
existed, adding the rule alone won't remove it from git history —
you'd need `git rm --cached <file>` plus a commit, and if it was
pushed already, treat that credential as compromised and rotate it.

## Google Cloud setup (do this first)

1. Go to console.cloud.google.com, create a project (or reuse one).
2. Enable the **Google Sheets API** for it.
3. Create a **Service Account** (IAM & Admin -> Service Accounts ->
   Create). No special role needed at the project level.
4. Create a key for it (Keys tab -> Add Key -> JSON) and download the
   JSON file. It contains `client_email` and `private_key` — those
   map to `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.
5. Open your actual AMIS spreadsheet, click **Share**, and add that
   `client_email` address as an **Editor**. This is the step people
   forget — without it the service account can authenticate but every
   read/write will fail with a permission error.
6. Copy the spreadsheet ID out of its URL for `SPREADSHEET_ID`.

## Vercel setup

1. Push this folder to a GitHub repo, import it into Vercel.
2. In Project Settings -> Environment Variables, add the three values
   from `.env.example` (`SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_PRIVATE_KEY` — paste the private key with its `\n` escapes
   intact, exactly as it appears in the JSON file).
3. Deploy. No build command needed — `public/` is served as static
   files, `api/rpc.js` becomes a serverless function automatically.

## Known carry-over, flagged on purpose

`checkSessionAndGetUser` (in `lib/auth.js`) is ported with the exact
same behavior as Code.gs: it trusts the role/region the browser sends
rather than re-checking the Users sheet's row. This matches your
"don't change the logic" instruction, but worth repeating: once this
is a public Vercel URL it's reachable directly (not just through your
own page), so this is more exposed than it was on Apps Script. I can
swap in a hardened version of just that one function whenever you
want — it wouldn't touch anything else.

Two more spots that needed a real (but invisible to users) substitute
because they rely on Apps Script features with no Sheets API
equivalent — both are now implemented, flagged here so you know what
to watch for:

- **`LockService`** (duplicate-ID prevention in `submit`) — replaced
  with a best-effort advisory lock using a `_locks` sheet
  (`lib/helpers.js`'s `withIdLock`). It meaningfully reduces collision
  risk for normal use (case workers entering records one at a time)
  but is **not** a true atomic lock the way Apps Script's was — two
  submissions landing in the exact same instant could still grab the
  same ID. If you expect heavier concurrent traffic, the real fix is
  an external lock (Vercel KV / Upstash Redis `SETNX`), not this.
- **`SpreadsheetApp.newCellImage()`** for digital signatures — Sheets
  API v4 has no equivalent for writing a base64 image as a rendered
  cell image. `handlers/submit.js` now stores the raw base64 data URL
  as plain cell text instead. The app keeps working (it renders the
  signature from that string itself), but two things to verify with
  real signature data: (1) Google Sheets caps cells at ~50,000
  characters — a large signature PNG could exceed that and fail to
  save; (2) opening the actual spreadsheet won't show a visual
  thumbnail anymore, just the base64 text. If either becomes a
  problem, the fix is uploading the signature to Drive and storing a
  link instead of the raw data.

One more assumption worth checking: every date display in the app
(`Utilities.formatDate(date, Session.getScriptTimeZone(), fmt)` in the
original) now uses a hardcoded `Asia/Manila` timezone in
`lib/helpers.js`'s `formatDate()`, since the region codes here are
Philippines DOH/DSWD regions. If your original Apps Script project's
timezone (Project Settings -> Time zone) was set to something else,
every displayed date/time would be off by that difference — update
the `TIMEZONE` constant in `lib/helpers.js` if so.

## Migration checklist

**Done:** login, signup, checkSession, logoutSession, toggleUserStatus,
getAllUsers, unlockAccount, autoUnlockExpiredAccounts, deleteUser,
updatePassword, getRegionsList, getBarangayList, getActivityLogs,
getDataChangeTimestamp, generateReport, searchNames, searchRecordByName,
getEnrolledListCached, getEnrolledRecordWithInfo, updateBasicInfo,
saveEnrolledInfo, saveHealthcareRecord, submit, getDashboardStats.

That covers login, signup/admin, viewing and editing a beneficiary
record end-to-end, the main dashboard, and the report generator.

**Still pending** — same porting pattern each time (read the Code.gs
function, translate the SpreadsheetApp calls to the `sheets`/`Range`
wrapper with `await`, drop it in `handlers/`, register it in
`api/rpc.js`):

**Dashboard (barangay view):** getDashboardStatsByBarangay,
calculateAgeStatsByBarangay, calculateSessionStatsByBarangayGlobal

**Sessions, attendance & test scores:** saveSessionAttendance,
getAllSessionAttendance, bulkUpdateSessions, getSessionTestRecords,
saveSessionTestScore, saveBulkSessionTestScores,
syncAttendanceFromTestScores, saveAllEnrolledData

**AMVAT:** getAllAMVATRecords, searchAMVATProfiles, getExistingAMVAT,
submitAMVATToQuarter, updateAMVATProfile

**Healthcare (records list):** getHealthcareRecords (saveHealthcareRecord
is already done)

**Payouts & grantees:** getPayoutRecords, savePayout,
getGranteeRecords, saveGrantee, deleteGrantee

**Pre/post test results:** getPTResults, savePTResult, savePTResultBulk

Until each one is ported, that specific feature shows the "isn't
ported to the Vercel backend yet" message via the same `success:false`
+ `message` shape the app already uses for errors — it won't crash
the rest of the app.
