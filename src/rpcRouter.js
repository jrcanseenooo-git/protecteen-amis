const { registry, EXPOSED_FUNCTIONS, LOCAL_ONLY_FUNCTIONS } = require("./config/registry");
const {
  APPS_SCRIPT_WEB_APP_URL,
  USE_APPS_SCRIPT_BACKEND,
  clearReadCacheForWrite,
  proxyToAppsScript,
} = require("./config/appsScriptProxy");

async function handleRpcRequest(payload, res) {
  const { fn, args } = payload || {};
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fn || "") || !EXPOSED_FUNCTIONS.has(fn)) {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Requested backend function is not available.",
      }),
    );
    return;
  }

  // Brand-new functions with no Code.gs counterpart must always run
  // locally, even in production where USE_APPS_SCRIPT_BACKEND is true
  // for every pre-existing function. This check never affects any
  // function not explicitly listed in LOCAL_ONLY_FUNCTIONS.
  if (!LOCAL_ONLY_FUNCTIONS.has(fn) && USE_APPS_SCRIPT_BACKEND) {
    await proxyToAppsScript(payload, res);
    return;
  }

  const handler = registry[fn];

  if (!handler) {
    if (APPS_SCRIPT_WEB_APP_URL) {
      await proxyToAppsScript(payload, res);
      return;
    }

    // Same {success:false, message} shape every handler already
    // returns, so app.js's existing error handling (showSnackbar with
    // result.message) just works for not-yet-ported endpoints too.
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: `"${fn}" isn't ported to the Vercel backend yet.`,
      }),
    );
    return;
  }

  try {
    const result = await handler(...(Array.isArray(args) ? args : []));
    clearReadCacheForWrite(payload);
    res.setHeader("Content-Type", "application/json");
    // Handlers already return JSON.stringify(...) strings, matching
    // exactly what google.script.run used to hand back - send as-is.
    res.end(typeof result === "string" ? result : JSON.stringify(result));
  } catch (error) {
    console.error("RPC handler failed", {
      fn,
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : undefined,
    });
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Something went wrong. Please try again.",
      }),
    );
  }
}

module.exports = {
  handleRpcRequest,
};
