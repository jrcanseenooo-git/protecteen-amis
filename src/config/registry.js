const authController = require("../controllers/authController");
const userAdminController = require("../controllers/userAdminController");
const enrolledController = require("../controllers/enrolledController");
const dashboardController = require("../controllers/dashboardController");
const reportsController = require("../controllers/reportsController");
const profileSearchController = require("../controllers/profileSearchController");
const healthcareController = require("../controllers/healthcareController");
const complianceController = require("../controllers/complianceController");
const exitController = require("../controllers/exitController");

const READ_ONLY_FUNCTIONS = new Set([
  "checkSession",
  "getActivityLogs",
  "getAllAMVATRecords",
  "getAllSessionAttendance",
  "getAllUsers",
  "getBarangayList",
  "getComplianceAnalytics",
  "getDashboardStats",
  "getDashboardStatsByBarangay",
  "getDataChangeTimestamp",
  "getEnrolledListCached",
  "getEnrolledRecordWithInfo",
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

// Functions that exist ONLY in this Node codebase — there is no Code.gs
// counterpart to proxy to, so these must always run locally even in
// production (where USE_APPS_SCRIPT_BACKEND is normally true for every
// other function). Adding a name here never changes behavior for any
// function NOT in this set.
const LOCAL_ONLY_FUNCTIONS = new Set([
  "getComplianceAnalytics",
  "getExitRecords",
  "recordBeneficiaryExit",
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
  // Still pending - see README.md migration checklist:
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

module.exports = {
  registry,
  READ_ONLY_FUNCTIONS,
  APPS_SCRIPT_FALLBACK_FUNCTIONS,
  LOCAL_ONLY_FUNCTIONS,
  EXPOSED_FUNCTIONS,
};
