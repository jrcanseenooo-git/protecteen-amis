const sheets = require("./sheetsClient");
const { SETTINGS } = require("../services/settings");

const SHEET_NAME = "contact_circle";
const MAX_CONTACTS = 8;

function buildHeaders() {
  const headers = ["ID Number", "Beneficiary Name"];
  for (let i = 1; i <= MAX_CONTACTS; i++) {
    headers.push(`Contact${i}_Name`, `Contact${i}_Office`, `Contact${i}_Number`, `Contact${i}_Email`, `Contact${i}_Address`);
  }
  headers.push("Last Updated", "Updated By");
  return headers;
}

const HEADERS = buildHeaders();

async function getSheet() {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists(SHEET_NAME);
  if (!exists) {
    const sheet = await ss.insertSheet(SHEET_NAME);
    await sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }
  return ss.getSheetByName(SHEET_NAME);
}

async function findRow(sheet, idNumber) {
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("ID Number");
  if (idIdx === -1) return { row: null, headers, data };
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === idNumber) return { row: i + 1, headers, rowData: data[i] };
  }
  return { row: null, headers };
}

async function getBeneficiaryName(idNumber) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!exists) return "";
  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("id_number");
  if (idIdx === -1) return "";
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === idNumber) {
      return [data[i][headers.indexOf("first_name")], data[i][headers.indexOf("middle_name")], data[i][headers.indexOf("last_name")]]
        .filter(Boolean).join(" ").trim();
    }
  }
  return "";
}

function rowToContacts(headers, rowData) {
  const contacts = [];
  for (let i = 1; i <= MAX_CONTACTS; i++) {
    contacts.push({
      name: rowData[headers.indexOf(`Contact${i}_Name`)] || "",
      office: rowData[headers.indexOf(`Contact${i}_Office`)] || "",
      number: rowData[headers.indexOf(`Contact${i}_Number`)] || "",
      email: rowData[headers.indexOf(`Contact${i}_Email`)] || "",
      address: rowData[headers.indexOf(`Contact${i}_Address`)] || "",
    });
  }
  return contacts;
}

async function getContactCircle(idNumber) {
  const sheet = await getSheet();
  const { headers, rowData } = await findRow(sheet, idNumber);
  if (!rowData) {
    return {
      idNumber,
      beneficiaryName: await getBeneficiaryName(idNumber),
      contacts: Array.from({ length: MAX_CONTACTS }, () => ({ name: "", office: "", number: "", email: "", address: "" })),
    };
  }
  return {
    idNumber,
    beneficiaryName: rowData[headers.indexOf("Beneficiary Name")] || "",
    contacts: rowToContacts(headers, rowData),
  };
}

async function saveContactCircle({ idNumber, contacts }, updatedByEmail) {
  const sheet = await getSheet();
  const beneficiaryName = await getBeneficiaryName(idNumber);
  const rowData = [idNumber, beneficiaryName];
  for (let i = 0; i < MAX_CONTACTS; i++) {
    const c = (contacts && contacts[i]) || {};
    rowData.push(c.name || "", c.office || "", c.number || "", c.email || "", c.address || "");
  }
  rowData.push(new Date().toISOString(), updatedByEmail || "");

  const { row } = await findRow(sheet, idNumber);
  if (row) {
    await sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  } else {
    await sheet.appendRow(rowData);
  }
}

// For the case-worker overview list — counts filled contacts per
// beneficiary without pulling every field.
async function getAllContactCircleSummaries() {
  const ss = sheets.getActive();
  const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!enrolledExists) return [];

  const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const eRange = await enrolledSheet.getDataRange();
  const eData = await eRange.getValues();
  const eHeaders = eData[0] || [];
  const idIdx = eHeaders.indexOf("id_number");
  const fnIdx = eHeaders.indexOf("first_name");
  const mnIdx = eHeaders.indexOf("middle_name");
  const lnIdx = eHeaders.indexOf("last_name");
  const regionIdx = eHeaders.indexOf("region");
  const barangayIdx = eHeaders.indexOf("barangay");
  if (idIdx === -1) return [];

  const sheet = await getSheet();
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const ccIdIdx = headers.indexOf("ID Number");
  const ccMap = {};
  if (ccIdIdx !== -1) {
    for (let i = 1; i < data.length; i++) {
      const id = data[i][ccIdIdx];
      if (id) ccMap[id] = rowToContacts(headers, data[i]).filter((c) => c.name).length;
    }
  }

  const records = [];
  for (let i = 1; i < eData.length; i++) {
    const id = eData[i][idIdx];
    if (!id) continue;
    records.push({
      idNumber: id,
      beneficiaryName: [eData[i][fnIdx], eData[i][mnIdx], eData[i][lnIdx]].filter(Boolean).join(" ").trim(),
      region: regionIdx !== -1 ? eData[i][regionIdx] || "" : "",
      barangay: barangayIdx !== -1 ? eData[i][barangayIdx] || "" : "",
      contactsFilled: ccMap[id] || 0,
    });
  }
  return records;
}

module.exports = { getContactCircle, saveContactCircle, getAllContactCircleSummaries, MAX_CONTACTS };
