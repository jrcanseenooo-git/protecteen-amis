const { checkSessionAndGetUser, logActivity } = require("../services/auth");
const { safeErrorResponse } = require("../services/errorResponse");
const {
  getEducationMonitoringRecords: fetchEducationMonitoringRecords,
  saveEducationMonitoringRecord: persistEducationMonitoringRecord,
  getBookletComplianceRecords: fetchBookletComplianceRecords,
  saveBookletComplianceRecord: persistBookletComplianceRecord,
} = require("../models/bookletMonitoringModel");

async function getEducationMonitoringRecords(month, regionFilter, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const records = await fetchEducationMonitoringRecords(month, regionFilter || null);
    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getEducationMonitoringRecords failed", error, { records: [] }));
  }
}

async function saveEducationMonitoringRecord(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    if (!data || !data.idNumber) {
      return JSON.stringify({ success: false, message: "Beneficiary is required." });
    }

    await persistEducationMonitoringRecord(data, sessionCheck.user.email);
    await logActivity(
      "EDUCATION_MONITORING_SAVED",
      { idNumber: data.idNumber, month: data.month },
      sessionCheck.user,
    );
    return JSON.stringify({ success: true, message: "Education monitoring saved." });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("saveEducationMonitoringRecord failed", error));
  }
}

async function getBookletComplianceRecords(month, regionFilter, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const records = await fetchBookletComplianceRecords(month, regionFilter || null);
    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getBookletComplianceRecords failed", error, { records: [] }));
  }
}

async function saveBookletComplianceRecord(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    if (!data || !data.idNumber) {
      return JSON.stringify({ success: false, message: "Beneficiary is required." });
    }

    await persistBookletComplianceRecord(data, sessionCheck.user.email);
    await logActivity(
      "BOOKLET_COMPLIANCE_SAVED",
      { idNumber: data.idNumber, month: data.month },
      sessionCheck.user,
    );
    return JSON.stringify({ success: true, message: "Booklet compliance saved." });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("saveBookletComplianceRecord failed", error));
  }
}

module.exports = {
  getEducationMonitoringRecords,
  saveEducationMonitoringRecord,
  getBookletComplianceRecords,
  saveBookletComplianceRecord,
};
