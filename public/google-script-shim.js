/**
 * google-script-shim.js
 * ----------------------------------------------------------------
 * Drop-in replacement for the `google.script.run` object that the
 * Apps Script HtmlService normally injects into the page.
 *
 * Purpose: app.js (originally script.html) calls things like
 *   google.script.run
 *     .withSuccessHandler(fn)
 *     .withFailureHandler(fn)
 *     .someBackendFunction(arg1, arg2)
 *
 * That object only exists when a page is served BY Apps Script.
 * On Vercel it doesn't exist at all, so we recreate its shape here,
 * routing every call to our own /api/rpc endpoint instead of Google's
 * internal RPC channel. Nothing in app.js needs to change because of
 * this file — every call site keeps working exactly as written.
 *
 * Behavior preserved on purpose, to match the original 1:1:
 *  - Every backend function in this app returns JSON.stringify(...).
 *    The original google.script.run delivers that EXACT STRING to
 *    withSuccessHandler (the frontend then does JSON.parse(response)
 *    itself, all over app.js). So this shim delivers the raw response
 *    text too — it does NOT parse it for you. Do not "fix" this even
 *    though it looks redundant; changing it would break every existing
 *    `JSON.parse(response)` call in app.js.
 *  - Network/HTTP errors are routed to withFailureHandler, same as a
 *    server-side thrown exception would be in real Apps Script.
 *  - Works for both `.functionName(args)` and `[dynamicName](args)`
 *    call styles (script.html uses both).
 */
(function () {
  "use strict";

  function buildRunner(successHandler, failureHandler) {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "withSuccessHandler") {
            return function (cb) {
              return buildRunner(cb, failureHandler);
            };
          }
          if (prop === "withFailureHandler") {
            return function (cb) {
              return buildRunner(successHandler, cb);
            };
          }
          if (prop === "withUserObject") {
            // Apps Script supports a 3rd "user object" passed back to the
            // handlers untouched. Not used anywhere in this app, but kept
            // here so a future call site doesn't silently break.
            return function () {
              return buildRunner(successHandler, failureHandler);
            };
          }

          // Anything else is treated as the name of the backend function
          // to invoke, e.g. google.script.run.login(data) or
          // google.script.run[method](data).
          const fnName = prop;

          return function (...args) {
            fetch("/api/rpc", {
              method: "POST",
              // text/plain avoids a CORS preflight; harmless here since
              // we're same-origin on Vercel anyway, kept for safety if
              // this is ever called cross-origin.
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ fn: fnName, args: args }),
            })
              .then(async (res) => {
                const text = await res.text();
                if (!res.ok) {
                  throw new Error(text || `Request failed (${res.status})`);
                }
                return text;
              })
              .then((text) => {
                if (successHandler) successHandler(text);
              })
              .catch((err) => {
                if (failureHandler) failureHandler(err);
              });
          };
        },
      },
    );
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = buildRunner(null, null);
})();
