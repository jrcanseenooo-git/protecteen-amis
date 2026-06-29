const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { isRowEmpty, getActualLastRow, formatDate, sanitizeInput } = require("../../services/helpers");
const { checkSessionAndGetUser } = require("../../services/auth");
const { safeErrorResponse } = require("../../services/errorResponse");

async function searchNames(searchValue, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) {
      return JSON.stringify({ success: false, names: [], message: "Session expired" });
    }
    const currentUser = sessionCheck.user;
    const isAdmin = currentUser.role === "admin";
    const userRegion = currentUser.region;

    if (!searchValue || searchValue.length < 2) {
      return JSON.stringify({ success: false, names: [], message: "Search query too short" });
    }

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.SOURCE);
    if (!exists) return JSON.stringify({ success: false, names: [] });

    const ws = ss.getSheetByName(SETTINGS.SHEET_NAME.SOURCE);
    const actualLastRow = await getActualLastRow(ws);
    if (actualLastRow < 2) return JSON.stringify({ success: false, names: [] });

    const lastCol = await ws.getLastColumn();
    const data = await ws.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = data[0];

    let firstNameIndex = -1, middleNameIndex = -1, lastNameIndex = -1, regionIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toString().toLowerCase().trim();
      if (header === "first_name") firstNameIndex = i;
      if (header === "middle_name") middleNameIndex = i;
      if (header === "last_name") lastNameIndex = i;
      if (header === "region") regionIndex = i;
    }

    if (firstNameIndex === -1) {
      return JSON.stringify({ success: false, names: [], message: "first_name column not found" });
    }

    const searchLower = searchValue.toLowerCase().trim();
    const matches = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;

      const firstName = (row[firstNameIndex] || "").toString().trim();
      if (!firstName) continue;

      if (!isAdmin && userRegion !== "ALL" && regionIndex !== -1) {
        const rowRegion = (row[regionIndex] || "").toString().trim().toLowerCase();
        if (rowRegion !== userRegion.toLowerCase()) continue;
      }

      const middleName = middleNameIndex !== -1 ? (row[middleNameIndex] || "").toString().trim() : "";
      const lastName = lastNameIndex !== -1 ? (row[lastNameIndex] || "").toString().trim() : "";
      const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, " ");

      if (fullName && fullName.toLowerCase().includes(searchLower)) {
        matches.push({ fullName, rowIndex: i });
      }
      if (matches.length >= 20) break;
    }

    const limitedMatches = matches.slice(0, 10);
    return JSON.stringify({ success: true, names: limitedMatches.map((m) => m.fullName) });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("searchNames failed", error, { names: [] }));
  }
}

async function searchRecordByName(fullName, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) {
      return JSON.stringify({ success: false, message: "Session expired" });
    }
    const currentUser = sessionCheck.user;
    const isAdmin = currentUser.role === "admin";
    const userRegion = currentUser.region;

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.SOURCE);
    if (!exists) return JSON.stringify({ success: false, message: "No records found in the database" });

    const ws = ss.getSheetByName(SETTINGS.SHEET_NAME.SOURCE);
    const actualLastRow = await getActualLastRow(ws);
    if (actualLastRow < 2) return JSON.stringify({ success: false, message: "No records found in the database" });

    const lastCol = await ws.getLastColumn();
    const data = await ws.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = data[0];

    const columnMap = {};
    for (let i = 0; i < headers.length; i++) {
      columnMap[headers[i].toString().toLowerCase().trim()] = i;
    }

    const firstNameIndex = columnMap["first_name"];
    const middleNameIndex = columnMap["middle_name"];
    const lastNameIndex = columnMap["last_name"];
    const regionIndex = columnMap["region"];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (isRowEmpty(row)) continue;

      const firstName = firstNameIndex !== undefined ? (row[firstNameIndex] || "").toString().trim() : "";
      if (!firstName) continue;

      const middleName = middleNameIndex !== undefined ? (row[middleNameIndex] || "").toString().trim() : "";
      const lastNameVal = lastNameIndex !== undefined ? (row[lastNameIndex] || "").toString().trim() : "";
      const recordFullName = `${firstName} ${middleName} ${lastNameVal}`.trim().replace(/\s+/g, " ");

      if (recordFullName.toLowerCase() === fullName.toLowerCase().trim()) {
        if (!isAdmin && userRegion !== "ALL" && regionIndex !== undefined) {
          const recordRegion = (row[regionIndex] || "").toString().trim().toLowerCase();
          if (recordRegion !== userRegion.toLowerCase()) {
            return JSON.stringify({
              success: false,
              message: "Access denied: This record is not in your assigned region",
            });
          }
        }

        const record = {};
        SETTINGS.HEADERS.forEach(({ key, value }) => {
          const headerName = value.toLowerCase().trim();
          const colIndex = columnMap[headerName] !== undefined ? columnMap[headerName] : columnMap[key];

          if (colIndex !== undefined && row[colIndex] !== undefined) {
            const cellValue = row[colIndex];
            if (cellValue instanceof Date) {
              record[key] = formatDate(cellValue, "yyyy-MM-dd");
            } else {
              record[key] = cellValue ? sanitizeInput(cellValue.toString().trim()) : "";
            }
          } else {
            record[key] = "";
          }
        });

        // Sheets API returns date cells as locale-formatted strings (e.g. "1/15/2001"),
        // not Date objects, so the instanceof branch above never fires for them.
        // Normalize any date field to YYYY-MM-DD so HTML date inputs can display it.
        if (record.date_birth) {
          const normalized = formatDate(record.date_birth, "yyyy-MM-dd");
          if (normalized) record.date_birth = normalized;
        }

        record.fromSource = true;

        const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
        if (enrolledExists) {
          const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
          const enrolledActualLastRow = await getActualLastRow(enrolledSheet);

          if (enrolledActualLastRow >= 2) {
            const enrolledLastCol = await enrolledSheet.getLastColumn();
            const enrolledData = await enrolledSheet.getRange(1, 1, enrolledActualLastRow, enrolledLastCol).getValues();
            const enrolledHeaders = enrolledData[0];

            let eFn = -1, eMn = -1, eLn = -1, eId = -1;
            for (let j = 0; j < enrolledHeaders.length; j++) {
              const header = enrolledHeaders[j].toString().toLowerCase().trim();
              if (header === "first_name") eFn = j;
              if (header === "middle_name") eMn = j;
              if (header === "last_name") eLn = j;
              if (header === "id_number" || header === "id") eId = j;
            }

            for (let k = 1; k < enrolledData.length; k++) {
              const enrolledRow = enrolledData[k];
              if (isRowEmpty(enrolledRow)) continue;
              if (eId !== -1 && (!enrolledRow[eId] || enrolledRow[eId] === "")) continue;

              const efn = eFn !== -1 ? (enrolledRow[eFn] || "").toString().trim() : "";
              const emn = eMn !== -1 ? (enrolledRow[eMn] || "").toString().trim() : "";
              const eln = eLn !== -1 ? (enrolledRow[eLn] || "").toString().trim() : "";
              const enrolledFullName = `${efn} ${emn} ${eln}`.trim().replace(/\s+/g, " ");

              if (enrolledFullName.toLowerCase() === fullName.toLowerCase().trim()) {
                record.alreadyEnrolled = true;
                record.existingEnrollmentId = eId !== -1 ? enrolledRow[eId] : "";
                record.enrolledRowIndex = k + 1;
                break;
              }
            }
          }
        }

        return JSON.stringify({ success: true, data: record });
      }
    }

    return JSON.stringify({ success: false, message: "No record found in your region" });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("searchRecordByName failed", error));
  }
}

module.exports = { searchNames, searchRecordByName };
