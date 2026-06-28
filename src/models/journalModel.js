const sheets = require("./sheetsClient");
const { SETTINGS } = require("../services/settings");

const SHEET_NAME = "journal_worker_notes";

const HEADERS = [
  "ID Number", "Beneficiary Name", "Region", "Province", "Municipality", "Barangay", "Month",
  "Session Notes",
  "Journal Thoughts", "Journal Feelings", "Journal Hope", "Journal EEG",
  "Worker Observations", "Worker Agreements", "Worker Name",
  "Entry Date", "Last Updated", "Updated By",
];

function normalizeMonth(month) {
  const n = Number(month || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(24, Math.max(1, Math.round(n)));
}

async function ensureSheet(ss) {
  const exists = await ss.sheetExists(SHEET_NAME);
  if (!exists) {
    const sheet = await ss.insertSheet(SHEET_NAME);
    await sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }
  return ss.getSheetByName(SHEET_NAME);
}

async function getEnrolledBeneficiaries(regionFilter) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!exists) return [];

  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idx = (name) => headers.indexOf(name);
  const idIdx = idx("id_number");
  if (idIdx === -1) return [];

  return data.slice(1)
    .filter((row) => row[idIdx])
    .map((row) => ({
      idNumber: row[idIdx],
      name: [row[idx("first_name")], row[idx("middle_name")], row[idx("last_name")]].filter(Boolean).join(" "),
      region: row[idx("region")] || "",
      province: row[idx("province")] || "",
      municipality: row[idx("municipality_city")] || "",
      barangay: row[idx("barangay")] || "",
    }))
    .filter((b) => !regionFilter || b.region === regionFilter);
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((h, i) => [h, row[i] !== undefined ? row[i] : ""]));
}

function findExistingRow(data, idNumber, month) {
  const headers = data[0] || [];
  const idIdx = headers.indexOf("ID Number");
  const monthIdx = headers.indexOf("Month");
  if (idIdx === -1 || monthIdx === -1) return null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idNumber) && Number(data[i][monthIdx]) === Number(month)) {
      return i + 1;
    }
  }
  return null;
}

async function getJournalWorkerNotes(month, regionFilter) {
  const selectedMonth = normalizeMonth(month);
  const ss = sheets.getActive();
  const beneficiaries = await getEnrolledBeneficiaries(regionFilter);

  const exists = await ss.sheetExists(SHEET_NAME);
  const keyed = new Map();
  if (exists) {
    const sheet = ss.getSheetByName(SHEET_NAME);
    const range = await sheet.getDataRange();
    const data = await range.getValues();
    const headers = data[0] || [];
    const idIdx = headers.indexOf("ID Number");
    const monthIdx = headers.indexOf("Month");
    for (let i = 1; i < data.length; i++) {
      const id = data[i][idIdx];
      if (id && Number(data[i][monthIdx]) === selectedMonth) {
        keyed.set(String(id), rowToObject(headers, data[i]));
      }
    }
  }

  return beneficiaries.map((b) => {
    const existing = keyed.get(String(b.idNumber)) || {};
    return {
      ...b,
      month: selectedMonth,
      sessionNotes: existing["Session Notes"] || "",
      journalThoughts: existing["Journal Thoughts"] || "",
      journalFeelings: existing["Journal Feelings"] || "",
      journalHope: existing["Journal Hope"] || "",
      journalEEG: existing["Journal EEG"] || "",
      workerObservations: existing["Worker Observations"] || "",
      workerAgreements: existing["Worker Agreements"] || "",
      workerName: existing["Worker Name"] || "",
      entryDate: existing["Entry Date"] || "",
      lastUpdated: existing["Last Updated"] || "",
      hasEntry: !!existing["ID Number"],
    };
  });
}

async function saveJournalWorkerNotes(data, updatedByEmail) {
  const ss = sheets.getActive();
  const sheet = await ensureSheet(ss);
  const month = normalizeMonth(data.month);

  const row = [
    data.idNumber,
    data.name || data.beneficiaryName || "",
    data.region || "",
    data.province || "",
    data.municipality || "",
    data.barangay || "",
    month,
    data.sessionNotes || "",
    data.journalThoughts || "",
    data.journalFeelings || "",
    data.journalHope || "",
    data.journalEEG || "",
    data.workerObservations || "",
    data.workerAgreements || "",
    data.workerName || "",
    data.entryDate || "",
    new Date().toISOString(),
    updatedByEmail || "",
  ];

  const range = await sheet.getDataRange();
  const existingData = await range.getValues();
  const targetRow = findExistingRow(existingData, data.idNumber, month);
  if (targetRow) {
    await sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    await sheet.appendRow(row);
  }
}

module.exports = { getJournalWorkerNotes, saveJournalWorkerNotes };
