const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { checkSessionAndGetUser } = require("../../services/auth");
const { safeErrorResponse } = require("../../services/errorResponse");

function normalizeRegion(value) {
  return String(value || "").replace(/^region\s+/i, "").trim().toUpperCase();
}

async function getAllowedIdsByRegion(ss, currentUser) {
  const isAdmin = currentUser.role === "admin";
  const userRegion = normalizeRegion(currentUser.region);
  if (isAdmin || !userRegion || userRegion === "ALL") return null;

  const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!enrolledExists) return new Set();

  const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const range = await enrolledSheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("id_number");
  const regionIdx = headers.indexOf("region");
  const allowed = new Set();

  if (idIdx === -1 || regionIdx === -1) return allowed;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idIdx]) continue;
    if (normalizeRegion(row[regionIdx]) === userRegion) {
      allowed.add(String(row[idIdx]));
    }
  }

  return allowed;
}

async function getGranteeRecords(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const ss = sheets.getActive();
    const exists = await ss.sheetExists("authorized_grantee");
    if (!exists) return JSON.stringify({ success: true, records: [] });

    const allowedIds = await getAllowedIdsByRegion(ss, sessionCheck.user);
    const sheet = ss.getSheetByName("authorized_grantee");
    const range = await sheet.getDataRange();
    const data = await range.getValues();
    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      if (allowedIds !== null && !allowedIds.has(String(row[0]))) continue;
      if (!row[4]) continue;

      records.push({
        id_number: row[0],
        name: row[1],
        municipality: row[2],
        barangay: row[3],
        grantee_name: row[4],
        relationship: row[5],
        contact: row[6],
        grantee_address: row[7],
        slot: "Primary",
        grantee2_name: row[8] || "",
        relationship2: row[9] || "",
        contact2: row[10] || "",
        grantee2_address: row[11] || "",
        timestamp: row[12] || "",
        updated_by: row[13] || "",
      });
    }

    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getGranteeRecords failed", error));
  }
}

module.exports = getGranteeRecords;
