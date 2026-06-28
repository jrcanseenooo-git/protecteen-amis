const sheets = require("./sheetsClient");
const { SETTINGS } = require("../services/settings");

// Bucket labels mirror the exact strings saveSessionAttendance() in
// Code.gs already writes into the "Compliance Status" column — matching
// by substring the same way public/app.js already does elsewhere, so
// this dashboard never drifts from what's actually being saved.
function bucketSessionStatus(status) {
  if (!status) return "Not Yet Tracked";
  if (status.includes("DELISTED")) return "Delisted";
  if (status.includes("Fourth")) return "Fourth Non-Compliant";
  if (status.includes("Third")) return "Third Non-Compliant";
  if (status.includes("Second")) return "Second Non-Compliant";
  if (status.includes("First")) return "First Non-Compliant";
  if (status.includes("Compliant")) return "Compliant";
  return "Not Yet Tracked";
}

async function getEnrolledRegionMap() {
  const ss = sheets.getActive();
  const map = {};
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!exists) return map;

  const sheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("id_number");
  const regionIdx = headers.indexOf("region");
  if (idIdx === -1) return map;

  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (id) map[id] = regionIdx !== -1 ? data[i][regionIdx] || "" : "";
  }
  return map;
}

async function getSessionComplianceBreakdown(regionMap, regionFilter) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("session_attendance");
  const buckets = {
    Compliant: 0,
    "First Non-Compliant": 0,
    "Second Non-Compliant": 0,
    "Third Non-Compliant": 0,
    "Fourth Non-Compliant": 0,
    Delisted: 0,
    "Not Yet Tracked": 0,
  };
  if (!exists) return { buckets, total: 0, tracked: false };

  const sheet = ss.getSheetByName("session_attendance");
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("ID Number");
  const statusIdx = headers.indexOf("Compliance Status");
  if (idIdx === -1) return { buckets, total: 0, tracked: false };

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (!id) continue;
    if (regionFilter && (regionMap[id] || "") !== regionFilter) continue;
    total++;
    const bucket = bucketSessionStatus(data[i][statusIdx] || "");
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  return { buckets, total, tracked: true };
}

async function getDelistingTrend(regionMap, regionFilter) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("delisted_beneficiaries");
  const byReason = {};
  const byMonth = {};
  if (!exists) return { total: 0, byReason, byMonth, tracked: true };

  const sheet = ss.getSheetByName("delisted_beneficiaries");
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("ID Number");
  const dateIdx = headers.indexOf("Delisted Date");
  const reasonIdx = headers.indexOf("Reason");
  if (idIdx === -1) return { total: 0, byReason, byMonth, tracked: true };

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (!id) continue;
    if (regionFilter && (regionMap[id] || "") !== regionFilter) continue;
    total++;

    const reason = data[i][reasonIdx] || "Unspecified";
    byReason[reason] = (byReason[reason] || 0) + 1;

    const rawDate = data[i][dateIdx];
    let monthKey = "Unknown";
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    }
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
  }
  return { total, byReason, byMonth, tracked: true };
}

async function getHealthcareCompliance(regionMap, regionFilter) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("healthcare_data");
  if (!exists) return { total: 0, fullyCompliant: 0, partial: 0, none: 0, tracked: false };

  const sheet = ss.getSheetByName("healthcare_data");
  const range = await sheet.getDataRange();
  const data = await range.getValues();
  const headers = data[0] || [];
  const idIdx = headers.indexOf("ID Number");
  const attendedCols = [3, 6, 9, 12, 15, 18, 21, 24].filter((c) => c < headers.length);
  // ^ Visit 1-4 Nanay/Anak "Attended" columns, per saveHealthcareRecord's
  // HC_HEADERS layout (3 fixed cols, then 8 groups of 3 per visit-side).
  if (idIdx === -1) return { total: 0, fullyCompliant: 0, partial: 0, none: 0, tracked: false };

  let total = 0, fullyCompliant = 0, partial = 0, none = 0;
  for (let i = 1; i < data.length; i++) {
    const id = data[i][idIdx];
    if (!id) continue;
    if (regionFilter && (regionMap[id] || "") !== regionFilter) continue;
    total++;

    const attendedCount = attendedCols.filter(
      (c) => data[i][c] === true || data[i][c] === "TRUE",
    ).length;

    if (attendedCount >= attendedCols.length) fullyCompliant++;
    else if (attendedCount > 0) partial++;
    else none++;
  }
  return { total, fullyCompliant, partial, none, tracked: true };
}

async function getComplianceAnalytics(regionFilter) {
  const regionMap = await getEnrolledRegionMap();
  const totalEnrolled = Object.keys(regionMap).filter(
    (id) => !regionFilter || (regionMap[id] || "") === regionFilter,
  ).length;

  const [sessions, delisting, healthcare] = await Promise.all([
    getSessionComplianceBreakdown(regionMap, regionFilter),
    getDelistingTrend(regionMap, regionFilter),
    getHealthcareCompliance(regionMap, regionFilter),
  ]);

  return {
    totalEnrolled,
    sessions,
    delisting,
    healthcare,
    // Honest placeholder — there is no education attendance module yet
    // (see Phase 3). Showing this explicitly rather than fabricating a
    // number is the whole point of marking it `tracked: false`.
    education: { tracked: false },
  };
}

module.exports = { getComplianceAnalytics };
