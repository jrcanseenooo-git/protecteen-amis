const { checkSessionAndGetUser, logActivity } = require("../services/auth");
const { safeErrorResponse } = require("../services/errorResponse");
const { sanitizeInput } = require("../services/helpers");
const {
  VALID_EXIT_TYPES,
  recordExit,
  getExitRecords: fetchExitRecords,
} = require("../models/exitModel");

async function recordBeneficiaryExit(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const idNumber = sanitizeInput(data && data.idNumber);
    const beneficiaryName = sanitizeInput(data && data.beneficiaryName);
    const exitType = data && data.exitType;
    const reason = sanitizeInput((data && data.reason) || "");

    if (!idNumber || !exitType) {
      return JSON.stringify({ success: false, message: "ID number and exit type are required." });
    }
    if (!VALID_EXIT_TYPES.includes(exitType)) {
      return JSON.stringify({
        success: false,
        message: `Exit type must be one of: ${VALID_EXIT_TYPES.join(", ")}`,
      });
    }

    await recordExit({
      idNumber,
      beneficiaryName,
      exitType,
      reason,
      recordedByEmail: currentUser.email,
    });

    await logActivity(
      "BENEFICIARY_EXIT_RECORDED",
      { idNumber, exitType, reason, recordedBy: currentUser.email },
      currentUser,
    );

    return JSON.stringify({ success: true, message: `Beneficiary recorded as ${exitType}.` });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("recordBeneficiaryExit failed", error));
  }
}

async function getExitRecords(regionFilter, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const records = await fetchExitRecords(regionFilter || null);
    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getExitRecords failed", error));
  }
}

module.exports = { recordBeneficiaryExit, getExitRecords };
