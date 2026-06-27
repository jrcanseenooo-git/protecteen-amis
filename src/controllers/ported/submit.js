const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const {
  isRowEmpty,
  getActualLastRow,
  sanitizeInput,
  validateFormData,
  checkForDuplicates,
  generateNextId,
  withIdLock,
} = require("../../services/helpers");
const { checkSessionAndGetUser, logActivity } = require("../../services/auth");
const { safeErrorResponse } = require("../../services/errorResponse");

async function submit(data, isUpdate = false, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (data._overrideDuplicate) {
      delete data._overrideDuplicate;
    } else if (!data.alreadyEnrolled && !isUpdate) {
      const duplicateCheck = await checkForDuplicates(data);
      if (duplicateCheck.isDuplicate) {
        return JSON.stringify({
          success: false,
          isDuplicate: true,
          duplicates: duplicateCheck.duplicates,
          message: duplicateCheck.message,
        });
      }
    }

    const validationErrors = validateFormData(data);
    if (validationErrors.length > 0) {
      return JSON.stringify({ success: false, message: "Validation failed: " + validationErrors.join(", ") });
    }

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string" && key !== "signature") {
        data[key] = sanitizeInput(data[key]);
      }
    });

    const ss = sheets.getActive();
    const headers = SETTINGS.HEADERS.map(({ value }) => value);

    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    const ws = exists
      ? ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES)
      : await ss.insertSheet(SETTINGS.SHEET_NAME.RESPONSES);

    if (!exists) {
      await ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    let id;
    let targetRow;
    let dateRegistered = new Date().toISOString();

    if (data.alreadyEnrolled && data.existingEnrollmentId) {
      id = data.existingEnrollmentId;
      const actualLastRow = await getActualLastRow(ws);
      const idColumn = await ws.getRange(1, 1, actualLastRow, 1).getValues();
      let foundRow = null;

      for (let i = 1; i < idColumn.length; i++) {
        if (idColumn[i][0] === id) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow) {
        const existingRow = await ws.getRange(foundRow, 1, 1, 17).getValues();
        if (existingRow[0][16]) dateRegistered = existingRow[0][16];
        targetRow = foundRow;
        isUpdate = true;
      } else {
        targetRow = (await ws.getLastRow()) + 1;
      }
    } else if (isUpdate && data.existingId) {
      id = data.existingId;
      const actualLastRow = await getActualLastRow(ws);
      const idColumn = await ws.getRange(1, 1, actualLastRow, 1).getValues();
      let foundRow = null;

      for (let i = 1; i < idColumn.length; i++) {
        if (idColumn[i][0] === id) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow) {
        const existingRow = await ws.getRange(foundRow, 1, 1, 17).getValues();
        if (existingRow[0][16]) dateRegistered = existingRow[0][16];
        targetRow = foundRow;
      } else {
        targetRow = (await ws.getLastRow()) + 1;
      }
    } else {
      // See lib/helpers.js withIdLock() — best-effort stand-in for the
      // original LockService.getScriptLock(); flagged there as not a
      // true atomic lock.
      const result = await withIdLock(async () => {
        const newId = await generateNextId(data.region);
        const newTargetRow = (await ws.getLastRow()) + 1;
        await ws.getRange(newTargetRow, 1).setValue(newId);
        return { newId, newTargetRow };
      });
      id = result.newId;
      targetRow = result.newTargetRow;
    }

    const values = await Promise.all(
      SETTINGS.HEADERS.map(async ({ key }, index) => {
        if (key === "id") return id;
        if (key === "date_registered") return dateRegistered;

        if (key === "signature" && isUpdate && (!data[key] || data[key] === "")) {
          try {
            const existing = await ws.getRange(targetRow, index + 1).getValue();
            return existing || "";
          } catch (e) {
            return "";
          }
        }

        if (!(key in data)) return "";
        if (Array.isArray(data[key])) return data[key].join(",");

        // ORIGINAL behavior: embeds the base64 signature as an actual
        // image object in the cell (SpreadsheetApp.newCellImage()).
        // Sheets API v4 has no direct equivalent for "write this base64
        // string as a rendered image in a cell value", so this stores
        // the raw base64 data URL as plain text instead. The app still
        // works end-to-end (it reads this value back and renders it as
        // an <img>/canvas itself) — the only difference is the cell
        // won't show a visual thumbnail if you open the actual Google
        // Sheet directly. One thing to verify with real data: Sheets
        // has a ~50,000 character per-cell limit, and a base64 PNG
        // signature can be large; if signatures start getting rejected
        // or truncated, that limit is why, and we'd switch to uploading
        // to Drive and storing a link instead.
        if (typeof data[key] === "string" && data[key].startsWith("data:image")) {
          return data[key];
        }

        return data[key];
      }),
    );

    await ws.getRange(targetRow, 1, 1, values.length).setValues([values]);

    const action = isUpdate ? "updated" : "enrolled";
    await logActivity(
      isUpdate ? "RECORD_UPDATED" : "RECORD_CREATED",
      { id, name: `${data.first_name} ${data.last_name}`, user: currentUser.email },
      currentUser,
    );

    return JSON.stringify({
      success: true,
      message: `Record ${action} successfully! ID: ${id}`,
      generatedId: id,
    });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("submit failed", error));
  }
}

module.exports = submit;
