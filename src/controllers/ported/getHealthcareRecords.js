const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { checkSessionAndGetUser } = require("../../services/auth");
const { safeErrorResponse } = require("../../services/errorResponse");

function parseHCDate(v) {
  if (!v) return "";
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toISOString().slice(0, 10); // yyyy-MM-dd, matching Code.gs's formatDate
  } catch (e) {
    return "";
  }
}

function toBool(v) {
  return v === true || v === "TRUE" || v === "Yes" || v === "true";
}

// Ported faithfully from Code.gs's getHealthcareRecords — including the
// old-20-column-format fallback, since some rows may predate the
// Nanay/Anak migration that saveHealthcareRecord.js already handles
// on write.
async function getHealthcareRecords(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const ss = sheets.getActive();
    const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!enrolledExists) return JSON.stringify({ success: true, records: [] });

    const isAdmin = currentUser.role === "admin";
    const userRegion = (currentUser.region || "").toString().trim().toUpperCase();

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const eRange = await enrolledSheet.getDataRange();
    const enrolledData = await eRange.getValues();
    const eHeaders = enrolledData[0] || [];
    const idIdx = eHeaders.indexOf("id_number");
    const fnIdx = eHeaders.indexOf("first_name");
    const mnIdx = eHeaders.indexOf("middle_name");
    const lnIdx = eHeaders.indexOf("last_name");
    const rgIdx = eHeaders.indexOf("region");
    const barangayIdx = eHeaders.indexOf("barangay");
    const municipalityIdx = eHeaders.indexOf("municipality_city");
    const provinceIdx = eHeaders.indexOf("province");

    // Build a map of existing healthcare records keyed by id_number
    const hcMap = {};
    const hcExists = await ss.sheetExists("healthcare_data");
    if (hcExists) {
      const hcSheet = ss.getSheetByName("healthcare_data");
      const hcRange = await hcSheet.getDataRange();
      const hcData = await hcRange.getValues();
      if (hcData.length > 1) {
        const hcHeaders = hcData[0];
        const isNewFormat = hcHeaders[3] && hcHeaders[3].toString().indexOf("Nanay") !== -1;

        for (let i = 1; i < hcData.length; i++) {
          const row = hcData[i];
          if (!row[0]) continue;

          if (isNewFormat) {
            hcMap[row[0]] = {
              visit1_nanay_attended: toBool(row[3]), visit1_nanay_date: parseHCDate(row[4]), visit1_nanay_practitioner: row[5] || "",
              visit1_anak_attended: toBool(row[6]), visit1_anak_date: parseHCDate(row[7]), visit1_anak_practitioner: row[8] || "",
              visit2_nanay_attended: toBool(row[9]), visit2_nanay_date: parseHCDate(row[10]), visit2_nanay_practitioner: row[11] || "",
              visit2_anak_attended: toBool(row[12]), visit2_anak_date: parseHCDate(row[13]), visit2_anak_practitioner: row[14] || "",
              visit3_nanay_attended: toBool(row[15]), visit3_nanay_date: parseHCDate(row[16]), visit3_nanay_practitioner: row[17] || "",
              visit3_anak_attended: toBool(row[18]), visit3_anak_date: parseHCDate(row[19]), visit3_anak_practitioner: row[20] || "",
              visit4_nanay_attended: toBool(row[21]), visit4_nanay_date: parseHCDate(row[22]), visit4_nanay_practitioner: row[23] || "",
              visit4_anak_attended: toBool(row[24]), visit4_anak_date: parseHCDate(row[25]), visit4_anak_practitioner: row[26] || "",
            };
          } else {
            // Old 20-column format fallback
            hcMap[row[0]] = {
              visit1_nanay_attended: toBool(row[5]), visit1_nanay_date: parseHCDate(row[3]), visit1_nanay_practitioner: row[4] || "",
              visit1_anak_attended: toBool(row[6]), visit1_anak_date: parseHCDate(row[3]), visit1_anak_practitioner: row[4] || "",
              visit2_nanay_attended: toBool(row[9]), visit2_nanay_date: parseHCDate(row[7]), visit2_nanay_practitioner: row[8] || "",
              visit2_anak_attended: toBool(row[10]), visit2_anak_date: parseHCDate(row[7]), visit2_anak_practitioner: row[8] || "",
              visit3_nanay_attended: toBool(row[13]), visit3_nanay_date: parseHCDate(row[11]), visit3_nanay_practitioner: row[12] || "",
              visit3_anak_attended: toBool(row[14]), visit3_anak_date: parseHCDate(row[11]), visit3_anak_practitioner: row[12] || "",
              visit4_nanay_attended: toBool(row[17]), visit4_nanay_date: parseHCDate(row[15]), visit4_nanay_practitioner: row[16] || "",
              visit4_anak_attended: toBool(row[18]), visit4_anak_date: parseHCDate(row[15]), visit4_anak_practitioner: row[16] || "",
            };
          }
        }
      }
    }

    // Build final records list from enrolled, merging healthcare data —
    // enrolled is the source of truth, same as Code.gs.
    const records = [];
    for (let i = 1; i < enrolledData.length; i++) {
      const row = enrolledData[i];
      if (!row[idIdx]) continue;

      const region = (row[rgIdx] || "").toString().trim().toUpperCase();
      if (!isAdmin && userRegion && region !== userRegion) continue;

      const idNumber = row[idIdx];
      const name = [row[fnIdx], row[mnIdx], row[lnIdx]].filter(Boolean).join(" ");
      const hc = hcMap[idNumber] || {};

      records.push({
        id_number: idNumber,
        name,
        region: row[rgIdx] ? "Region " + row[rgIdx] : "",
        address: [row[barangayIdx], row[municipalityIdx], row[provinceIdx]].filter(Boolean).join(", "),
        barangay: row[barangayIdx] || "",
        municipality: row[municipalityIdx] || "",
        province: row[provinceIdx] || "",
        visit1_nanay_attended: hc.visit1_nanay_attended || false,
        visit1_nanay_date: hc.visit1_nanay_date || "",
        visit1_nanay_practitioner: hc.visit1_nanay_practitioner || "",
        visit1_anak_attended: hc.visit1_anak_attended || false,
        visit1_anak_date: hc.visit1_anak_date || "",
        visit1_anak_practitioner: hc.visit1_anak_practitioner || "",
        visit2_nanay_attended: hc.visit2_nanay_attended || false,
        visit2_nanay_date: hc.visit2_nanay_date || "",
        visit2_nanay_practitioner: hc.visit2_nanay_practitioner || "",
        visit2_anak_attended: hc.visit2_anak_attended || false,
        visit2_anak_date: hc.visit2_anak_date || "",
        visit2_anak_practitioner: hc.visit2_anak_practitioner || "",
        visit3_nanay_attended: hc.visit3_nanay_attended || false,
        visit3_nanay_date: hc.visit3_nanay_date || "",
        visit3_nanay_practitioner: hc.visit3_nanay_practitioner || "",
        visit3_anak_attended: hc.visit3_anak_attended || false,
        visit3_anak_date: hc.visit3_anak_date || "",
        visit3_anak_practitioner: hc.visit3_anak_practitioner || "",
        visit4_nanay_attended: hc.visit4_nanay_attended || false,
        visit4_nanay_date: hc.visit4_nanay_date || "",
        visit4_nanay_practitioner: hc.visit4_nanay_practitioner || "",
        visit4_anak_attended: hc.visit4_anak_attended || false,
        visit4_anak_date: hc.visit4_anak_date || "",
        visit4_anak_practitioner: hc.visit4_anak_practitioner || "",
      });
    }

    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getHealthcareRecords failed", error));
  }
}

module.exports = getHealthcareRecords;
