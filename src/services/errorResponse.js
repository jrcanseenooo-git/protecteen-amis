// Shared helper so every backend error is logged with full detail on
// the server (visible in Vercel function logs / your terminal), while
// the client only ever receives a safe, generic message. This matches
// SECURITY_DEPLOYMENT_RULES.md: "never expose stack traces, raw
// exception text, secrets, tokens, spreadsheet IDs, or deployment URLs
// in browser messages."
//
// `extra` lets a caller keep returning whatever additional fields the
// frontend already expects on failure (e.g. `regions: []`, `silent:
// true`) without changing that response shape — only the `message`
// text and the act of logging are new.
function safeErrorResponse(context, error, extra = {}) {
  console.error(context, error);
  return {
    success: false,
    message: "Something went wrong. Please try again.",
    ...extra,
  };
}

module.exports = { safeErrorResponse };
