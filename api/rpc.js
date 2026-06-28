const { handleRpcRequest } = require("../src/rpcRouter");
const { checkAndRecordAttempt, getClientIp } = require("../src/services/rateLimiter");

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      /* fall through to manual stream read */
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, message: "Method not allowed" }));
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, message: "Invalid request body" }));
    return;
  }

  // Rate limit auth-sensitive calls only (login/signup/updatePassword) —
  // per SECURITY_DEPLOYMENT_RULES.md, 5 attempts/minute/IP combined.
  // checkAndRecordAttempt is a no-op (always allowed) for every other
  // function, so this can never affect normal app usage.
  const clientIp = getClientIp(req);
  const rateLimitResult = checkAndRecordAttempt(clientIp, payload && payload.fn);
  if (!rateLimitResult.allowed) {
    console.error("Rate limit exceeded", { fn: payload && payload.fn, ip: clientIp });
    res.statusCode = 429;
    res.setHeader("Retry-After", String(rateLimitResult.retryAfterSeconds));
    res.end(
      JSON.stringify({
        success: false,
        message: "Too many attempts. Please try again in a minute.",
      }),
    );
    return;
  }

  await handleRpcRequest(payload, res);
};
