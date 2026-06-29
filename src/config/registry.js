const authController = require("../controllers/authController");
const userAdminController = require("../controllers/userAdminController");
const enrolledController = require("../controllers/enrolledController");
const dashboardController = require("../controllers/dashboardController");
const reportsController = require("../controllers/reportsController");
const profileSearchController = require("../controllers/profileSearchController");
const healthcareController = require("../controllers/healthcareController");
const complianceController = require("../controllers/complianceController");
const exitController = require("../controllers/exitController");
const bookletMonitoringController = require("../controllers/bookletMonitoringController");

const READ_ONLY_FUNCTIONS = new Set([
  "checkSession",
  "getActivityLogs",
  "getAllAMVATRecords",
  "getAllSessionAttendance",
  "getAllUsers",
  "getBarangayList",
  "getBookletComplianceRecords",
  "getComplianceAnalytics",
  "getDashboardStats",
  "getDashboardStatsByBarangay",
  "getDataChangeTimestamp",
  "getEnrolledListCached",
  "getEnrolledRecordWithInfo",
  "getEducationMonitoringRecords",
  "getExistingAMVAT",
  "getExitRecords",
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

// Functions that have NO local handler and must be proxied to Apps Script.
// Do NOT add functions that exist in the local registry — those are always
// handled locally now (rpcRouter checks registry first).
const APPS_SCRIPT_FALLBACK_FUNCTIONS = new Set([
  "bulkUpdateSessions",
  "deleteGrantee",
  "getAllAMVATRecords",
  "getAllSessionAttendance",
  "getDashboardStatsByBarangay",
  "getExistingAMVAT",
  "getPayoutRecords",
  "getPTResults",
  "getSessionTestRecords",
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

// Functions that exist ONLY in this Node codebase — there is no Code.gs
// counterpart to proxy to, so these must always run locally even in
// production (where USE_APPS_SCRIPT_BACKEND is normally true for every
// other function). Adding a name here never changes behavior for any
// function NOT in this set.
const LOCAL_ONLY_FUNCTIONS = new Set([
  "getBookletComplianceRecords",
  "getComplianceAnalytics",
  "getEducationMonitoringRecords",
  "getExitRecords",
  "getGranteeRecords",
  "recordBeneficiaryExit",
  "saveBookletComplianceRecord",
  "saveEducationMonitoringRecord",
]);

const registry = {
  ...authController,
  ...userAdminController,
  ...reportsController,
  ...profileSearchController,
  ...enrolledController,
  ...healthcareController,
  ...dashboardController,
  ...complianceController,
  ...exitController,
  ...bookletMonitoringController,
  // Not yet ported (still proxied to Apps Script via APPS_SCRIPT_FALLBACK_FUNCTIONS):
  // getDashboardStatsByBarangay, saveSessionAttendance, getAllSessionAttendance,
  // bulkUpdateSessions, getSessionTestRecords, saveSessionTestScore,
  // saveBulkSessionTestScores, syncAttendanceFromTestScores,
  // getAllAMVATRecords, searchAMVATProfiles, getExistingAMVAT,
  // submitAMVATToQuarter, updateAMVATProfile,
  // getPayoutRecords, savePayout, saveGrantee, deleteGrantee,
  // getPTResults, savePTResult, savePTResultBulk
};

const EXPOSED_FUNCTIONS = new Set([
  ...Object.keys(registry),
  ...APPS_SCRIPT_FALLBACK_FUNCTIONS,
]);

module.exports = {
  registry,
  READ_ONLY_FUNCTIONS,
  APPS_SCRIPT_FALLBACK_FUNCTIONS,
  LOCAL_ONLY_FUNCTIONS,
  EXPOSED_FUNCTIONS,
};
