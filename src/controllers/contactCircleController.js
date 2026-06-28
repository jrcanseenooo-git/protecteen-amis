const { checkSessionAndGetUser, logActivity } = require("../services/auth");
const { safeErrorResponse } = require("../services/errorResponse");
const { sanitizeInput } = require("../services/helpers");
const {
  getContactCircle: fetchContactCircle,
  saveContactCircle: persistContactCircle,
  getAllContactCircleSummaries: fetchAllSummaries,
} = require("../models/contactCircleModel");

async function getContactCircle(idNumber, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const record = await fetchContactCircle(sanitizeInput(idNumber));
    return JSON.stringify({ success: true, record });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getContactCircle failed", error));
  }
}

async function saveContactCircle(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const idNumber = sanitizeInput(data && data.idNumber);
    if (!idNumber) {
      return JSON.stringify({ success: false, message: "ID number is required." });
    }

    const contacts = (data.contacts || []).map((c) => ({
      name: sanitizeInput(c.name || ""),
      office: sanitizeInput(c.office || ""),
      number: sanitizeInput(c.number || ""),
      email: sanitizeInput(c.email || ""),
      address: sanitizeInput(c.address || ""),
    }));

    await persistContactCircle({ idNumber, contacts }, currentUser.email);
    await logActivity("CONTACT_CIRCLE_UPDATED", { idNumber, updatedBy: currentUser.email }, currentUser);

    return JSON.stringify({ success: true, message: "Contact Circle saved successfully." });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("saveContactCircle failed", error));
  }
}

async function getAllContactCircleSummaries(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const records = await fetchAllSummaries();
    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getAllContactCircleSummaries failed", error));
  }
}

module.exports = { getContactCircle, saveContactCircle, getAllContactCircleSummaries };
