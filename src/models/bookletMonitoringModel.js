const sheets = require("./sheetsClient");
const { SETTINGS } = require("../services/settings");

const EDUCATION_SHEET = "education_monitoring";
const BOOKLET_COMPLIANCE_SHEET = "booklet_compliance_monitoring";
const BENEFICIARY_CACHE_TTL_MS = Number(process.env.BOOKLET_BENEFICIARY_CACHE_TTL_MS || 60000);
let beneficiaryCache = null;
let beneficiaryCacheAt = 0;

const EDUCATION_HEADERS = [
  "ID Number",
  "Beneficiary Name",
  "Region",
  "Province",
  "Municipality",
  "Barangay",
  "Month",
  "School Name",
  "Education Type",
  "Days Attended",
  "Teacher Signature Date",
  "Return Commitment",
  "Case Worker Confirmed",
  "Status",
  "Notes",
  "Last Updated",
  "Updated By",
];

const BOOKLET_HEADERS = [
  "ID Number",
  "Beneficiary Name",
  "Region",
  "Province",
  "Municipality",
  "Barangay",
  "Month",
  "HATS",
  "Medical Certificate Or Prescription",
  "Pregnancy Test",
  "Certificate Of Enrollment",
  "Booklet Signed By Advisor",
  "Certificate Of Attendance",
  "Beneficiary Signature",
  "Social Worker Signature",
  "Verification Status",
  "Observations",
  "Last Updated",
  "Updated By",
];

function normalizeMonth(month) {
  const n = Number(month || 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(24, Math.max(1, Math.round(n)));
}

function truthy(value) {
  return value === true || value === "TRUE" || value === "Yes" || value === "yes";
}

function normalizeStatus(value) {
  const status = (value || "").toString().trim();
  return status || "Not Yet Tracked";
}

async function ensureSheet(ss, sheetName, headers) {
  const exists = await ss.sheetExists(sheetName);
  let sheet;
  if (!exists) {
    sheet = await ss.insertSheet(sheetName);
    await sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  sheet = ss.getSheetByName(sheetName);
  const lastCol = await sheet.getLastColumn();
  const currentHeaders = (await sheet.getRange(1, 1, 1, lastCol).getValues())[0] || [];
  const missing = headers.filter((h) => !currentHeaders.includes(h));
  if (missing.length) {
    const nextCol = currentHeaders.length + 1;
    await sheet.getRange(1, nextCol, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

async function getSheetRows(ss, sheetName) {
  const exists = await ss.sheetExists(sheetName);
  if (!exists) return { headers: [], rows: [] };
  const sheet = ss.getSheetByName(sheetName);
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  return { headers: data[0] || [], rows: data.slice(1), sheet };
}

async function getEnrolledBeneficiaries(regionFilter) {
  const now = Date.now();
  if (beneficiaryCache && now - beneficiaryCacheAt < BENEFICIARY_CACHE_TTL_MS) {
    return beneficiaryCache.filter((record) => !regionFilter || record.region === regionFilter);
  }

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

  beneficiaryCache = data.slice(1)
    .filter((row) => row[idIdx])
    .map((row) => {
      const region = row[idx("region")] || "";
      return {
        idNumber: row[idIdx],
        name: [row[idx("first_name")], row[idx("middle_name")], row[idx("last_name")]]
          .filter(Boolean)
          .join(" "),
        region,
        province: row[idx("province")] || "",
        municipality: row[idx("municipality_city")] || "",
        barangay: row[idx("barangay")] || "",
      };
    });
  beneficiaryCacheAt = now;

  return beneficiaryCache.filter((record) => !regionFilter || record.region === regionFilter);
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]));
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

async function upsertRow(sheet, headers, idNumber, month, row) {
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const targetRow = findExistingRow(data, idNumber, month);
  if (targetRow) {
    await sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  } else {
    await sheet.appendRow(row);
  }
}

async function getEducationMonitoringRecords(month, regionFilter) {
  const selectedMonth = normalizeMonth(month);
  const ss = sheets.getActive();
  const beneficiaries = await getEnrolledBeneficiaries(regionFilter);
  const { headers, rows } = await getSheetRows(ss, EDUCATION_SHEET);
  const idIdx = headers.indexOf("ID Number");
  const monthIdx = headers.indexOf("Month");
  const keyed = new Map();

  rows.forEach((row) => {
    const id = row[idIdx];
    const rowMonth = Number(row[monthIdx]);
    if (id && rowMonth === selectedMonth) {
      keyed.set(String(id), rowToObject(headers, row));
    }
  });

  return beneficiaries.map((beneficiary) => {
    const existing = keyed.get(String(beneficiary.idNumber)) || {};
    return {
      ...beneficiary,
      month: selectedMonth,
      schoolName: existing["School Name"] || "",
      educationType: existing["Education Type"] || "",
      daysAttended: existing["Days Attended"] || "",
      teacherSignatureDate: existing["Teacher Signature Date"] || "",
      returnCommitment: truthy(existing["Return Commitment"]),
      caseWorkerConfirmed: truthy(existing["Case Worker Confirmed"]),
      status: normalizeStatus(existing["Status"]),
      notes: existing["Notes"] || "",
      lastUpdated: existing["Last Updated"] || "",
      updatedBy: existing["Updated By"] || "",
    };
  });
}

async function saveEducationMonitoringRecord(data, updatedBy) {
  const ss = sheets.getActive();
  const sheet = await ensureSheet(ss, EDUCATION_SHEET, EDUCATION_HEADERS);
  const month = normalizeMonth(data.month);
  const status = normalizeStatus(data.status);
  const row = [
    data.idNumber,
    data.name || data.beneficiaryName || "",
    data.region || "",
    data.province || "",
    data.municipality || "",
    data.barangay || "",
    month,
    data.schoolName || "",
    data.educationType || "",
    data.daysAttended || "",
    data.teacherSignatureDate || "",
    !!data.returnCommitment,
    !!data.caseWorkerConfirmed,
    status,
    data.notes || "",
    new Date().toISOString(),
    updatedBy || "",
  ];

  await upsertRow(sheet, EDUCATION_HEADERS, data.idNumber, month, row);
}

async function getBookletComplianceRecords(month, regionFilter) {
  const selectedMonth = normalizeMonth(month);
  const ss = sheets.getActive();
  const beneficiaries = await getEnrolledBeneficiaries(regionFilter);
  const { headers, rows } = await getSheetRows(ss, BOOKLET_COMPLIANCE_SHEET);
  const idIdx = headers.indexOf("ID Number");
  const monthIdx = headers.indexOf("Month");
  const keyed = new Map();

  rows.forEach((row) => {
    const id = row[idIdx];
    const rowMonth = Number(row[monthIdx]);
    if (id && rowMonth === selectedMonth) {
      keyed.set(String(id), rowToObject(headers, row));
    }
  });

  return beneficiaries.map((beneficiary) => {
    const existing = keyed.get(String(beneficiary.idNumber)) || {};
    return {
      ...beneficiary,
      month: selectedMonth,
      hats: truthy(existing["HATS"]),
      medicalCertificate: truthy(existing["Medical Certificate Or Prescription"]),
      pregnancyTest: truthy(existing["Pregnancy Test"]),
      certificateEnrollment: truthy(existing["Certificate Of Enrollment"]),
      bookletSignedByAdvisor: truthy(existing["Booklet Signed By Advisor"]),
      certificateAttendance: truthy(existing["Certificate Of Attendance"]),
      beneficiarySignature: truthy(existing["Beneficiary Signature"]),
      socialWorkerSignature: truthy(existing["Social Worker Signature"]),
      verificationStatus: normalizeStatus(existing["Verification Status"]),
      observations: existing["Observations"] || "",
      lastUpdated: existing["Last Updated"] || "",
      updatedBy: existing["Updated By"] || "",
    };
  });
}

async function saveBookletComplianceRecord(data, updatedBy) {
  const ss = sheets.getActive();
  const sheet = await ensureSheet(ss, BOOKLET_COMPLIANCE_SHEET, BOOKLET_HEADERS);
  const month = normalizeMonth(data.month);
  const row = [
    data.idNumber,
    data.name || data.beneficiaryName || "",
    data.region || "",
    data.province || "",
    data.municipality || "",
    data.barangay || "",
    month,
    !!data.hats,
    !!data.medicalCertificate,
    !!data.pregnancyTest,
    !!data.certificateEnrollment,
    !!data.bookletSignedByAdvisor,
    !!data.certificateAttendance,
    !!data.beneficiarySignature,
    !!data.socialWorkerSignature,
    normalizeStatus(data.verificationStatus),
    data.observations || "",
    new Date().toISOString(),
    updatedBy || "",
  ];

  await upsertRow(sheet, BOOKLET_HEADERS, data.idNumber, month, row);
}

async function getBookletMonitoringAnalytics(regionFilter) {
  const ss = sheets.getActive();
  const beneficiaries = await getEnrolledBeneficiaries(regionFilter);
  const beneficiaryIds = new Set(beneficiaries.map((b) => String(b.idNumber)));

  const education = { totalRecords: 0, compliant: 0, partial: 0, notCompliant: 0, notTracked: 0 };
  const educationRows = await getSheetRows(ss, EDUCATION_SHEET);
  const educationHeaders = educationRows.headers;
  const educationIdIdx = educationHeaders.indexOf("ID Number");
  const educationStatusIdx = educationHeaders.indexOf("Status");
  const educationTrackedIds = new Set();

  educationRows.rows.forEach((row) => {
    const id = String(row[educationIdIdx] || "");
    if (!beneficiaryIds.has(id)) return;
    education.totalRecords++;
    educationTrackedIds.add(id);
    const status = normalizeStatus(row[educationStatusIdx]).toLowerCase();
    if (status.includes("compliant") && !status.includes("non")) education.compliant++;
    else if (status.includes("partial")) education.partial++;
    else education.notCompliant++;
  });
  education.notTracked = Math.max(0, beneficiaryIds.size - educationTrackedIds.size);

  const checklist = { totalRecords: 0, complete: 0, incomplete: 0, notTracked: 0 };
  const checklistRows = await getSheetRows(ss, BOOKLET_COMPLIANCE_SHEET);
  const checklistHeaders = checklistRows.headers;
  const checklistIdIdx = checklistHeaders.indexOf("ID Number");
  const trackedChecklistIds = new Set();
  const required = [
    "HATS",
    "Medical Certificate Or Prescription",
    "Pregnancy Test",
    "Certificate Of Enrollment",
    "Booklet Signed By Advisor",
    "Certificate Of Attendance",
    "Beneficiary Signature",
    "Social Worker Signature",
  ].map((h) => checklistHeaders.indexOf(h));

  checklistRows.rows.forEach((row) => {
    const id = String(row[checklistIdIdx] || "");
    if (!beneficiaryIds.has(id)) return;
    checklist.totalRecords++;
    trackedChecklistIds.add(id);
    if (required.every((idx) => idx !== -1 && truthy(row[idx]))) checklist.complete++;
    else checklist.incomplete++;
  });
  checklist.notTracked = Math.max(0, beneficiaryIds.size - trackedChecklistIds.size);

  return { education, checklist };
}

module.exports = {
  getEducationMonitoringRecords,
  saveEducationMonitoringRecord,
  getBookletComplianceRecords,
  saveBookletComplianceRecord,
  getBookletMonitoringAnalytics,
};
