const sheets = require("./sheetsClient");
const { SETTINGS } = require("../services/settings");

const EXIT_HEADERS = [
  "ID Number", "Beneficiary Name", "Exit Type", "Reason",
  "Exit Date", "Recorded By", "Last Updated",
];

// Exit Type matches the booklet's Exit Form exactly — three checkboxes:
// Delistment / Voluntary exit / Graduation. Anything more granular than
// that lives in the free-text Reason field, same as the paper form.
const VALID_EXIT_TYPES = ["Delistment", "Voluntary Exit", "Graduation"];

async function getEnrolledIndexById() {
  const ss = sheets.getActive();
  const map = {};
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!exists) return { map, headers: [], sheet: null };

  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("id_number");
  if (idIdx === -1) return { map, headers, sheet };

  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (id) map[id] = { row: i + 1, data: data[i] };
  }
  return { map, headers, sheet };
}

// Appends a "program_status" column to am_enrolled if it doesn't already
// exist, and returns its 0-indexed column position. Purely additive —
// every existing handler that reads am_enrolled by column NAME (every
// one of them does) is completely unaffected by a new trailing column.
async function ensureProgramStatusColumn(sheet, headers) {
  let idx = headers.indexOf("program_status");
  if (idx !== -1) return idx;

  idx = headers.length;
  await sheet.getRange(1, idx + 1).setValue("program_status");
  return idx;
}

async function setBeneficiaryProgramStatus(idNumber, status) {
  const { map, headers, sheet } = await getEnrolledIndexById();
  if (!sheet || !map[idNumber]) return false;

  const colIdx = await ensureProgramStatusColumn(sheet, headers);
  await sheet.getRange(map[idNumber].row, colIdx + 1).setValue(status);
  return true;
}

async function recordExit({ idNumber, beneficiaryName, exitType, reason, recordedByEmail }) {
  if (!VALID_EXIT_TYPES.includes(exitType)) {
    throw new Error(`Invalid exit type: ${exitType}`);
  }

  const ss = sheets.getActive();
  const exists = await ss.sheetExists("exit_records");
  let sheet;
  if (!exists) {
    sheet = await ss.insertSheet("exit_records");
    await sheet.getRange(1, 1, 1, EXIT_HEADERS.length).setValues([EXIT_HEADERS]);
  } else {
    sheet = ss.getSheetByName("exit_records");
  }

  await sheet.appendRow([
    idNumber,
    beneficiaryName,
    exitType,
    reason || "",
    new Date().toISOString(),
    recordedByEmail,
    new Date().toISOString(),
  ]);

  // Graduation/Voluntary/Delistment-by-case-worker all flow through here.
  // (Auto-delist from 3-consecutive/5-total session absences is a
  // separate, already-existing path in Code.gs that writes straight to
  // delisted_beneficiaries — left untouched, just merged for display
  // in getExitRecords below.)
  await setBeneficiaryProgramStatus(idNumber, exitType === "Graduation" ? "Graduated" : "Exited");
}

async function getExitRecords(regionFilter) {
  const { map: enrolledMap, headers: enrolledHeaders } = await getEnrolledIndexById();
  const regionColIdx = enrolledHeaders.indexOf("region");
  const ss = sheets.getActive();

  function regionOf(idNumber) {
    if (regionColIdx === -1) return "";
    const rec = enrolledMap[idNumber];
    return rec ? rec.data[regionColIdx] || "" : "";
  }

  const records = [];

  // Manual exits (Graduation / Voluntary Exit / Delistment-by-case-worker)
  const exitExists = await ss.sheetExists("exit_records");
  if (exitExists) {
    const sheet = ss.getSheetByName("exit_records");
    const range = await sheet.getDataRange();
    const data = await range.getValues();
    const headers = data[0] || [];
    const idIdx = headers.indexOf("ID Number");
    if (idIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        const id = data[i][idIdx];
        if (!id) continue;
        if (regionFilter && regionOf(id) !== regionFilter) continue;
        records.push({
          idNumber: id,
          name: data[i][headers.indexOf("Beneficiary Name")] || "",
          exitType: data[i][headers.indexOf("Exit Type")] || "",
          reason: data[i][headers.indexOf("Reason")] || "",
          exitDate: data[i][headers.indexOf("Exit Date")] || "",
          recordedBy: data[i][headers.indexOf("Recorded By")] || "",
          source: "manual",
        });
      }
    }
  }

  // Auto-delisted from session non-compliance (existing Code.gs path,
  // untouched — just surfaced here so the Delisted view shows everyone
  // in one place instead of two disconnected screens).
  const delistExists = await ss.sheetExists("delisted_beneficiaries");
  if (delistExists) {
    const sheet = ss.getSheetByName("delisted_beneficiaries");
    const range = await sheet.getDataRange();
    const data = await range.getValues();
    const headers = data[0] || [];
    const idIdx = headers.indexOf("ID Number");
    if (idIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        const id = data[i][idIdx];
        if (!id) continue;
        if (regionFilter && regionOf(id) !== regionFilter) continue;
        records.push({
          idNumber: id,
          name: data[i][headers.indexOf("Name")] || "",
          exitType: "Delistment",
          reason: data[i][headers.indexOf("Reason")] || "",
          exitDate: data[i][headers.indexOf("Delisted Date")] || "",
          recordedBy: data[i][headers.indexOf("Delisted By")] || "",
          absentSessions: data[i][headers.indexOf("Absent Sessions")] || "",
          source: "auto-session-noncompliance",
        });
      }
    }
  }

  records.sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate));
  return records;
}

module.exports = {
  VALID_EXIT_TYPES,
  recordExit,
  getExitRecords,
  setBeneficiaryProgramStatus,
};
