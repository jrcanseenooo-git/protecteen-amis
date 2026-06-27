/**
 * Add this file to the existing Apps Script backend project when the
 * frontend is hosted on Vercel.
 *
 * Vercel sends:
 *   { "fn": "login", "args": [ ... ] }
 *
 * This adapter calls the existing global Apps Script function with the
 * same arguments, then returns the same raw string that google.script.run
 * used to pass to the frontend success handler.
 */
function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var fn = payload.fn;
    var args = Array.isArray(payload.args) ? payload.args : [];

    if (!fn || fn === "doGet" || fn === "doPost" || typeof globalThis[fn] !== "function") {
      return jsonOutput({
        success: false,
        message: '"' + fn + '" is not available in Apps Script backend.',
      });
    }

    var result = globalThis[fn].apply(null, args);
    return ContentService
      .createTextOutput(typeof result === "string" ? result : JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return jsonOutput({ success: false, message: "Apps Script RPC error: " + error });
  }
}

function jsonOutput(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
