// Registry of ported Code.gs functions. Add one line here each time
// another handler gets ported — this is the only place that needs to
// know about all of them.
const { checkSession, logoutSession } = require("../handlers/checkSession");
const {
  toggleUserStatus,
  getAllUsers,
  unlockAccount,
  autoUnlockExpiredAccounts,
  deleteUser,
  updatePassword,
} = require("../handlers/userAdmin");
const {
  getRegionsList,
  getBarangayList,
  getActivityLogs,
  getDataChangeTimestamp,
  generateReport,
} = require("../handlers/reports");
const { searchNames, searchRecordByName } = require("../handlers/profileSearch");

const APPS_SCRIPT_WEB_APP_URL = process.env.APPS_SCRIPT_WEB_APP_URL;
const USE_APPS_SCRIPT_BACKEND =
  APPS_SCRIPT_WEB_APP_URL && process.env.FORCE_LOCAL_BACKEND !== "1";
const DEFAULT_READ_CACHE_TTL_MS = Number(
  process.env.APPS_SCRIPT_READ_CACHE_TTL_MS || 15000,
);
const readCache = new Map();

const READ_ONLY_FUNCTIONS = new Set([
  "checkSession",
  "getActivityLogs",
  "getAllAMVATRecords",
  "getAllSessionAttendance",
  "getAllUsers",
  "getBarangayList",
  "getDashboardStats",
  "getDashboardStatsByBarangay",
  "getDataChangeTimestamp",
  "getEnrolledListCached",
  "getEnrolledRecordWithInfo",
  "getExistingAMVAT",
  "getGranteeRecords",
  "getHealthcareRecords",
  "getPayoutRecords",
  "getPTResults",
  "getRegionsList",
  "getSessionTestRecords",
  "searchAMVATProfiles",
  "searchNames",
  "searchRecordByName",
]);

const APPS_SCRIPT_FALLBACK_FUNCTIONS = new Set([
  "bulkUpdateSessions",
  "deleteGrantee",
  "getAllAMVATRecords",
  "getAllSessionAttendance",
  "getDashboardStatsByBarangay",
  "getExistingAMVAT",
  "getGranteeRecords",
  "getHealthcareRecords",
  "getPayoutRecords",
  "getPTResults",
  "getSessionTestRecords",
  "saveAllEnrolledData",
  "saveBulkSessionTestScores",
  "saveGrantee",
  "savePayout",
  "savePTResult",
  "savePTResultBulk",
  "saveSessionAttendance",
  "saveSessionTestScore",
  "searchAMVATProfiles",
  "submitAMVATToQuarter",
  "syncAttendanceFromTestScores",
  "updateAMVATProfile",
]);

const registry = {
  login: require("../handlers/login"),
  signup: require("../handlers/signup"),
  checkSession,
  logoutSession,
  toggleUserStatus,
  getAllUsers,
  unlockAccount,
  autoUnlockExpiredAccounts,
  deleteUser,
  updatePassword,
  getRegionsList,
  getBarangayList,
  getActivityLogs,
  getDataChangeTimestamp,
  generateReport,
  searchNames,
  searchRecordByName,
  getEnrolledListCached: require("../handlers/getEnrolledListCached"),
  getEnrolledRecordWithInfo: require("../handlers/getEnrolledRecordWithInfo"),
  updateBasicInfo: require("../handlers/updateBasicInfo"),
  saveEnrolledInfo: require("../handlers/saveEnrolledInfo"),
  saveHealthcareRecord: require("../handlers/saveHealthcareRecord"),
  submit: require("../handlers/submit"),
  getDashboardStats: require("../handlers/getDashboardStats"),
  // Still pending — see README.md migration checklist:
  // getDashboardStatsByBarangay, saveSessionAttendance,
  // getAllSessionAttendance, bulkUpdateSessions, getSessionTestRecords,
  // saveSessionTestScore, saveBulkSessionTestScores,
  // syncAttendanceFromTestScores, saveAllEnrolledData,
  // getAllAMVATRecords, searchAMVATProfiles, getExistingAMVAT,
  // submitAMVATToQuarter, updateAMVATProfile, getHealthcareRecords,
  // getPayoutRecords, savePayout, getGranteeRecords, saveGrantee,
  // deleteGrantee, getPTResults, savePTResult, savePTResultBulk
};

const EXPOSED_FUNCTIONS = new Set([
  ...Object.keys(registry),
  ...APPS_SCRIPT_FALLBACK_FUNCTIONS,
]);

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

function getCacheKey(payload) {
  return JSON.stringify(payload || {});
}

function getCachedResponse(payload) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn) || DEFAULT_READ_CACHE_TTL_MS <= 0) {
    return null;
  }

  const cacheKey = getCacheKey(payload);
  const cached = readCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    readCache.delete(cacheKey);
    return null;
  }

  return cached.text;
}

function setCachedResponse(payload, text) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn) || DEFAULT_READ_CACHE_TTL_MS <= 0) {
    return;
  }

  readCache.set(getCacheKey(payload), {
    text,
    expiresAt: Date.now() + DEFAULT_READ_CACHE_TTL_MS,
  });
}

function clearReadCacheForWrite(payload) {
  const fn = payload && payload.fn;
  if (!READ_ONLY_FUNCTIONS.has(fn)) {
    readCache.clear();
  }
}

async function proxyToAppsScript(payload, res) {
  try {
    const cached = getCachedResponse(payload);
    if (cached) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-AMIS-Cache", "HIT");
      res.end(cached);
      return;
    }

    const upstream = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await upstream.text();
    const trimmed = text.trim();
    if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message:
            "Apps Script backend is not accessible. Check the Web App deployment access and APPS_SCRIPT_WEB_APP_URL.",
        }),
      );
      return;
    }

    res.statusCode = upstream.ok ? 200 : upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-AMIS-Cache", "MISS");
    if (upstream.ok) {
      setCachedResponse(payload, text);
      clearReadCacheForWrite(payload);
    }
    res.end(text);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Apps Script backend request failed: " + error.toString(),
      }),
    );
  }
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

  if (USE_APPS_SCRIPT_BACKEND) {
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
    // exactly what google.script.run used to hand back — send as-is.
    res.end(typeof result === "string" ? result : JSON.stringify(result));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: error.toString() }));
  }
};
