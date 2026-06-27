const authController = require("../controllers/authController");
const userAdminController = require("../controllers/userAdminController");
const enrolledController = require("../controllers/enrolledController");
const dashboardController = require("../controllers/dashboardController");
const reportsController = require("../controllers/reportsController");
const profileSearchController = require("../controllers/profileSearchController");
const healthcareController = require("../controllers/healthcareController");

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
  ...authController,
  ...userAdminController,
  ...reportsController,
  ...profileSearchController,
  ...enrolledController,
  ...healthcareController,
  ...dashboardController,
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
  EXPOSED_FUNCTIONS,
};
