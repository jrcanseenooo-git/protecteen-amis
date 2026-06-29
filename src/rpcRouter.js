const { registry, EXPOSED_FUNCTIONS } = require("./config/registry");
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

  // Local handler always takes precedence. Only fall through to Apps Script
  // for functions that haven't been ported yet (no entry in the registry).
  const handler = registry[fn];

  if (handler) {
    try {
      const result = await handler(...(Array.isArray(args) ? args : []));
      clearReadCacheForWrite(payload);
      res.setHeader("Content-Type", "application/json");
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
    return;
  }

  // No local handler — proxy to Apps Script for still-pending migrations.
  if (USE_APPS_SCRIPT_BACKEND || APPS_SCRIPT_WEB_APP_URL) {
    await proxyToAppsScript(payload, res);
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      success: false,
      message: `"${fn}" isn't ported to the local backend yet.`,
    }),
  );
}

module.exports = {
  handleRpcRequest,
};
