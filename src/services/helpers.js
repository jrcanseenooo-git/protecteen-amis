const sheets = require("../models/sheetsClient");
const { SETTINGS } = require("./settings");
const { safeErrorResponse } = require("./errorResponse");

// ── Direct ports, unchanged logic ──────────────────────────────────

function isRowEmpty(row) {
  const criticalColumns = [0, 1, 3];
  for (let i = 0; i < criticalColumns.length; i++) {
    const colIndex = criticalColumns[i];
    if (colIndex < row.length) {
      const cell = row[colIndex];
      if (cell !== null && cell !== undefined && cell !== "") {
        return false;
      }
    }
  }
  return true;
}

async function getActualLastRow(sheet) {
  const lastRow = await sheet.getLastRow();
  if (lastRow <= 1) return 1;

  const numColumns = Math.min(3, await sheet.getLastColumn());
  const data = await sheet.getRange(2, 1, lastRow - 1, numColumns).getValues();

  for (let i = data.length - 1; i >= 0; i--) {
    for (let j = 0; j < data[i].length; j++) {
      if (data[i][j] !== "" && data[i][j] !== null) {
        return i + 2;
      }
    }
  }
  return 1;
}

function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

function validateRegion(region) {
  return SETTINGS.VALID_REGIONS.includes(region);
}

function validateFormData(data) {
  const errors = [];

  if (data.contact_number && !/^[0-9+\-() ]+$/.test(data.contact_number)) {
    errors.push("Invalid contact number format");
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }
  if (data.date_birth) {
    const dob = new Date(data.date_birth);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 9 || age > 100) {
      errors.push("Invalid age range (must be between 9 and 100)");
    }
  }
  if (data.has_child === "Yes" && (!data.children_number || parseInt(data.children_number, 10) < 1)) {
    errors.push('Number of children must be at least 1 when "Has Child" is Yes');
  }
  if (data.region && !validateRegion(data.region)) {
    errors.push("Invalid region code");
  }

  return errors;
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// ── Date formatting ────────────────────────────────────────────────
// Stands in for Utilities.formatDate(date, Session.getScriptTimeZone(), fmt).
// ASSUMPTION FLAGGED: using Asia/Manila since this is a Philippines
// program (region codes are DOH/DSWD regions). If the original Apps
// Script project's timezone (Project Settings -> Time zone) was set to
// something else, change TIMEZONE below to match — every date string
// the app displays depends on this being right.
const TIMEZONE = "Asia/Manila";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDate(date, fmt) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const yyyy = get("year");
  const MM = get("month");
  const dd = get("day");
  let HH = get("hour");
  if (HH === "24") HH = "00";
  const mm = get("minute");
  const ss = get("second");

  switch (fmt) {
    case "yyyy-MM-dd":
      return `${yyyy}-${MM}-${dd}`;
    case "yyyy-MM-dd HH:mm":
      return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
    case "yyyy-MM-dd HH:mm:ss":
      return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
    default:
      return `${yyyy}-${MM}-${dd}`;
  }
}

// ── checkForDuplicates — direct port ────────────────────────────────

async function checkForDuplicates(data) {
  try {
    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) return { isDuplicate: false };

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return { isDuplicate: false };

    const lastCol = await enrolledSheet.getLastColumn();
    const enrolledData = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = enrolledData[0];

    const firstNameIndex = headers.indexOf("first_name");
    const middleNameIndex = headers.indexOf("middle_name");
    const lastNameIndex = headers.indexOf("last_name");
    const dobIndex = headers.indexOf("date_birth");
    const contactIndex = headers.indexOf("contact_number");
    const idIndex = headers.indexOf("id_number");

    const incomingFullName = `${data.first_name} ${data.middle_name || ""} ${data.last_name}`
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    const incomingDOB = data.date_birth ? new Date(data.date_birth).toDateString() : null;
    const incomingContact = data.contact_number ? data.contact_number.replace(/\D/g, "") : null;

    const potentialDuplicates = [];

    for (let i = 1; i < enrolledData.length; i++) {
      const row = enrolledData[i];
      if (isRowEmpty(row) || !row[idIndex]) continue;

      const rowFullName = `${row[firstNameIndex] || ""} ${row[middleNameIndex] || ""} ${row[lastNameIndex] || ""}`
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
      const rowDOB = row[dobIndex] ? new Date(row[dobIndex]).toDateString() : null;
      const rowContact = row[contactIndex] ? row[contactIndex].toString().replace(/\D/g, "") : null;

      let matchScore = 0;
      const matchDetails = [];

      if (rowFullName === incomingFullName) {
        matchScore += 50;
        matchDetails.push("Exact name match");
      } else if (calculateSimilarity(rowFullName, incomingFullName) > 0.85) {
        matchScore += 30;
        matchDetails.push("Similar name");
      }

      if (incomingDOB && rowDOB && incomingDOB === rowDOB) {
        matchScore += 30;
        matchDetails.push("Same date of birth");
      }

      if (incomingContact && rowContact && incomingContact.slice(-7) === rowContact.slice(-7)) {
        matchScore += 20;
        matchDetails.push("Same contact number");
      }

      if (matchScore >= 50) {
        potentialDuplicates.push({
          id: row[idIndex],
          name: `${row[firstNameIndex]} ${row[middleNameIndex] || ""} ${row[lastNameIndex]}`.trim(),
          dob: rowDOB,
          contact: row[contactIndex],
          matchScore,
          matchDetails: matchDetails.join(", "),
          confidence: matchScore >= 80 ? "High" : matchScore >= 60 ? "Medium" : "Low",
        });
      }
    }

    if (potentialDuplicates.length > 0) {
      potentialDuplicates.sort((a, b) => b.matchScore - a.matchScore);
      return {
        isDuplicate: true,
        duplicates: potentialDuplicates,
        message: `Found ${potentialDuplicates.length} potential duplicate(s)`,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    return { isDuplicate: false, ...safeErrorResponse("checkForDuplicates failed", error) };
  }
}

// ── generateNextId — direct port ────────────────────────────────────

async function generateNextId(region) {
  const ss = sheets.getActive();
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);
  const regionCode = SETTINGS.REGION_MAP[region] || "01";
  const prefix = `PTN-${regionCode}${yearSuffix}-`;

  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
  if (!exists) return `${prefix}000001`;

  const ws = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
  const actualLastRow = await getActualLastRow(ws);
  if (actualLastRow < 2) return `${prefix}000001`;

  const data = await ws.getRange(1, 1, actualLastRow, 1).getValues();
  let maxGlobalSequence = 0;

  for (let i = 1; i < data.length; i++) {
    const id = data[i][0];
    if (!id || typeof id !== "string" || id.trim() === "") continue;
    const parts = id.split("-");
    if (parts.length === 3 && parts[0] === "PTN") {
      const sequence = parseInt(parts[2], 10);
      if (!isNaN(sequence) && sequence > maxGlobalSequence) {
        maxGlobalSequence = sequence;
      }
    }
  }

  const nextSequence = maxGlobalSequence + 1;
  const paddedSequence = String(nextSequence).padStart(6, "0");
  return `${prefix}${paddedSequence}`;
}

// ── Best-effort replacement for LockService.getScriptLock() ────────
// Apps Script's LockService gives a real mutex across executions.
// There's no equivalent primitive available here without adding an
// external service (e.g. Vercel KV / Upstash Redis). This uses a
// dedicated "_locks" sheet row as an advisory lock: good enough to
// stop two requests landing at the *same instant* from colliding under
// light/normal traffic (case workers entering records one at a time),
// but it is NOT a true atomic lock — back-to-back concurrent submits
// within the same ~1-2s window could still race. Flagging this clearly
// rather than pretending it's equivalent to the original.
async function withIdLock(fn) {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("_locks");
  if (!exists) await ss.insertSheet("_locks");
  const lockSheet = ss.getSheetByName("_locks");

  const lockKey = "submit_id_lock";
  const maxWaitMs = 30000;
  const staleAfterMs = 30000;
  const pollMs = 400;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const current = await lockSheet.getRange(1, 1, 1, 2).getValues();
    const [existingKey, existingTs] = current[0];
    const isStale = existingTs && Date.now() - Number(existingTs) > staleAfterMs;

    if (!existingKey || isStale) {
      const myToken = Date.now();
      await lockSheet.getRange(1, 1, 1, 2).setValues([[lockKey, myToken]]);
      // Re-read to reduce (not eliminate) the chance of a same-instant
      // collision with another request that also just wrote.
      const confirm = await lockSheet.getRange(1, 1, 1, 2).getValues();
      if (Number(confirm[0][1]) === myToken) {
        try {
          return await fn();
        } finally {
          await lockSheet.getRange(1, 1, 1, 2).setValues([["", ""]]);
        }
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error("Could not acquire ID lock (timed out after 30s)");
}

module.exports = {
  isRowEmpty,
  getActualLastRow,
  sanitizeInput,
  validateRegion,
  validateFormData,
  formatDate,
  calculateSimilarity,
  levenshteinDistance,
  checkForDuplicates,
  generateNextId,
  withIdLock,
};
