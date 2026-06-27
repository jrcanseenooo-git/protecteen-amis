const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { getActualLastRow, sanitizeInput, validateFormData } = require("../../services/helpers");
const { checkSessionAndGetUser, logActivity } = require("../../services/auth");
const { safeErrorResponse } = require("../../services/errorResponse");

async function updateBasicInfo(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string" && key !== "id_number") {
        data[key] = sanitizeInput(data[key]);
      }
    });

    const validationErrors = validateFormData(data);
    if (validationErrors.length > 0) {
      return JSON.stringify({ success: false, message: "Validation failed: " + validationErrors.join(", ") });
    }

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) return JSON.stringify({ success: false, message: "Enrolled sheet not found" });

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return JSON.stringify({ success: false, message: "No records found" });

    const lastCol = await enrolledSheet.getLastColumn();
    const enrolledData = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = enrolledData[0];

    let targetRow = null;
    for (let i = 1; i < enrolledData.length; i++) {
      if (enrolledData[i][0] === data.id_number) {
        targetRow = i + 1;
        break;
      }
    }

    if (!targetRow) return JSON.stringify({ success: false, message: "Record not found" });

    const updatableFields = {
      first_name: headers.indexOf("first_name"),
      middle_name: headers.indexOf("middle_name"),
      last_name: headers.indexOf("last_name"),
      date_birth: headers.indexOf("date_birth"),
      civil_status: headers.indexOf("civil_status"),
      contact_number: headers.indexOf("contact_number"),
      region: headers.indexOf("region"),
      province: headers.indexOf("province"),
      municipality_city: headers.indexOf("municipality_city"),
      barangay: headers.indexOf("barangay"),
      has_child: headers.indexOf("has_child"),
      children_number: headers.indexOf("children_number"),
      living_partner: headers.indexOf("living_partner"),
    };

    for (const field of Object.keys(updatableFields)) {
      const colIndex = updatableFields[field];
      if (colIndex !== -1 && data[field] !== undefined) {
        await enrolledSheet.getRange(targetRow, colIndex + 1).setValue(data[field]);
      }
    }

    await logActivity("BASIC_INFO_UPDATED", { idNumber: data.id_number, updatedBy: currentUser.email }, currentUser);

    return JSON.stringify({ success: true, message: "Basic information updated successfully" });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("updateBasicInfo failed", error));
  }
}

module.exports = updateBasicInfo;
