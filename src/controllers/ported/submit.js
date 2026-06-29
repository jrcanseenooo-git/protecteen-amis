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
      if (typeof data[key] === "string") {
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
    const _now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    let dateRegistered = `${_now.getMonth() + 1}/${_now.getDate()}/${_now.getFullYear()}`;

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
        const existingRow = await ws.getRange(foundRow, 1, 1, SETTINGS.HEADERS.length).getValues();
        if (existingRow[0][SETTINGS.HEADERS.length - 1]) dateRegistered = existingRow[0][SETTINGS.HEADERS.length - 1];
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
        const existingRow = await ws.getRange(foundRow, 1, 1, SETTINGS.HEADERS.length).getValues();
        if (existingRow[0][SETTINGS.HEADERS.length - 1]) dateRegistered = existingRow[0][SETTINGS.HEADERS.length - 1];
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

        if (!(key in data)) return "";
        if (Array.isArray(data[key])) return data[key].join(",");

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
