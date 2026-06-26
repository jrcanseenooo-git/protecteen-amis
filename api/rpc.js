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

  const { fn, args } = payload || {};
  const handler = registry[fn];

  if (!handler) {
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
