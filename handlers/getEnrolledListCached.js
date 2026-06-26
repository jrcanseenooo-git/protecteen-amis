const sheets = require("../lib/sheetsClient");
const { SETTINGS } = require("../lib/settings");
const { isRowEmpty, getActualLastRow, formatDate } = require("../lib/helpers");
const { checkSessionAndGetUser } = require("../lib/auth");

async function getEnrolledListCached(page, pageSize, forceRefresh, searchQuery, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const isAdmin = currentUser.role === SETTINGS.USER_ROLES.ADMIN;
    const userRegion = currentUser.region;

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) {
      return JSON.stringify({ success: true, data: [], total: 0, timestamp: new Date().toISOString() });
    }

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) {
      return JSON.stringify({ success: true, data: [], total: 0, timestamp: new Date().toISOString() });
    }

    const numColumns = 17;
    const data = await enrolledSheet.getRange(1, 1, actualLastRow, numColumns).getValues();
    const headers = data[0];
    const regionIndex = headers.indexOf("region");
    const idIndex = headers.indexOf("id_number");

    let rows = [];
    const essentialColumns = [
      "id_number", "first_name", "middle_name", "last_name", "date_birth",
      "sex", "civil_status", "contact_number", "region", "province",
      "municipality_city", "barangay", "date_registered",
    ];

    for (let i = 1; i < data.length; i++) {
      const currentRow = data[i];
      if (!currentRow[idIndex] || currentRow[idIndex] === "") continue;
      if (isRowEmpty(currentRow)) continue;

      if (!isAdmin && userRegion !== "ALL" && regionIndex !== -1) {
        const rowRegion = (currentRow[regionIndex] || "").toLowerCase();
        if (rowRegion !== userRegion.toLowerCase()) continue;
      }

      const row = {};
      essentialColumns.forEach((key) => {
        const index = headers.indexOf(key);
        if (index !== -1) {
          const value = currentRow[index];
          if (value instanceof Date) {
            row[key] = formatDate(value, "yyyy-MM-dd");
          } else {
            row[key] = value || "";
          }
        }
      });

      rows.push(row);
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const search = searchQuery.toLowerCase();
      rows = rows.filter((row) => Object.values(row).some((val) => String(val).toLowerCase().includes(search)));
    }

    return JSON.stringify({
      success: true,
      data: rows,
      total: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString(), timestamp: new Date().toISOString() });
  }
}

module.exports = getEnrolledListCached;
