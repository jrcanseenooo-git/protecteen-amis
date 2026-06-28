// In-memory, sliding-window rate limiter for auth-sensitive RPC calls
// (login, signup, password changes). Per SECURITY_DEPLOYMENT_RULES.md:
// "Auth routes must allow at most 5 attempts per minute per IP."
//
// Honest limitation: this is in-process memory, not a shared store like
// Redis. On Vercel, that means the budget resets on a cold start and
// isn't shared across concurrent warm instances — a distributed
// attacker spreading requests across many instances could exceed 5/min
// in aggregate. This is the same tradeoff this codebase already accepts
// for the Apps-Script-proxy read cache (see appsScriptProxy.js) — a
// real, useful first line of defense for normal abuse, not a hardened
// guarantee. Worth upgrading to a shared store (Vercel KV/Redis) if
// this ever needs to withstand a serious distributed attack.

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

// One combined budget per IP across all auth-sensitive functions, not
// 5 per function — otherwise spreading attempts across login/signup/
// updatePassword would allow 15/minute instead of 5.
const AUTH_SENSITIVE_FUNCTIONS = new Set(["login", "signup", "updatePassword"]);

const attemptsByIp = new Map();

function isAuthSensitive(fn) {
  return AUTH_SENSITIVE_FUNCTIONS.has(fn);
}

function pruneOld(timestamps, now) {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

// Call once per incoming request for auth-sensitive functions. Returns
// { allowed: true } or { allowed: false, retryAfterSeconds }. Records
// the attempt as part of the same call — callers should call this
// exactly once per request, not once-to-check and once-to-record.
function checkAndRecordAttempt(ip, fn) {
  if (!isAuthSensitive(fn)) return { allowed: true };

  const key = ip || "unknown";
  const now = Date.now();
  const existing = pruneOld(attemptsByIp.get(key) || [], now);

  if (existing.length >= MAX_ATTEMPTS_PER_WINDOW) {
    const oldestInWindow = existing[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldestInWindow)) / 1000));
    // Keep the array as-is (don't record this blocked attempt as a new
    // timestamp) so the window empties out naturally.
    attemptsByIp.set(key, existing);
    return { allowed: false, retryAfterSeconds };
  }

  existing.push(now);
  attemptsByIp.set(key, existing);
  return { allowed: true };
}

// Extracts the real client IP on Vercel (behind a proxy, so the
// connection's own remote address is always Vercel's edge, not the
// visitor). x-forwarded-for can contain a comma-separated chain;
// the first entry is the original client.
function getClientIp(req) {
  const forwarded = req.headers && req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

module.exports = { checkAndRecordAttempt, getClientIp, isAuthSensitive, MAX_ATTEMPTS_PER_WINDOW };
