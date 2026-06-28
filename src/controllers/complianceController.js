const { checkSessionAndGetUser } = require("../services/auth");
const { safeErrorResponse } = require("../services/errorResponse");
const { getComplianceAnalytics: computeAnalytics } = require("../models/complianceModel");

async function getComplianceAnalytics(regionFilter, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const data = await computeAnalytics(regionFilter || null);
    return JSON.stringify({ success: true, ...data });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getComplianceAnalytics failed", error));
  }
}

module.exports = { getComplianceAnalytics };
