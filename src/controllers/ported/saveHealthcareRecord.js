const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { checkSessionAndGetUser } = require("../../services/auth");

const HC_HEADERS = [
  "ID Number", "Name", "Region",
  "Visit 1 Nanay Attended", "Visit 1 Nanay Date", "Visit 1 Nanay Practitioner",
  "Visit 1 Anak Attended", "Visit 1 Anak Date", "Visit 1 Anak Practitioner",
  "Visit 2 Nanay Attended", "Visit 2 Nanay Date", "Visit 2 Nanay Practitioner",
  "Visit 2 Anak Attended", "Visit 2 Anak Date", "Visit 2 Anak Practitioner",
  "Visit 3 Nanay Attended", "Visit 3 Nanay Date", "Visit 3 Nanay Practitioner",
  "Visit 3 Anak Attended", "Visit 3 Anak Date", "Visit 3 Anak Practitioner",
  "Visit 4 Nanay Attended", "Visit 4 Nanay Date", "Visit 4 Nanay Practitioner",
  "Visit 4 Anak Attended", "Visit 4 Anak Date", "Visit 4 Anak Practitioner",
  "Last Updated",
];

async function saveHealthcareRecord(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const ss = sheets.getActive();
    const exists = await ss.sheetExists("healthcare_data");
    let sheet;

    if (!exists) {
      sheet = await ss.insertSheet("healthcare_data");
      await sheet.getRange(1, 1, 1, HC_HEADERS.length).setValues([HC_HEADERS]);
    } else {
      sheet = ss.getSheetByName("healthcare_data");
      const lastCol = await sheet.getLastColumn();
      const existingHeaders = (await sheet.getRange(1, 1, 1, lastCol).getValues())[0];

      if (existingHeaders.length < HC_HEADERS.length || existingHeaders[3] === "Visit 1 Date") {
        // Old 20-column format detected — migrate, preserving data.
        const oldLastRow = await sheet.getLastRow();
        const oldData = oldLastRow > 1
          ? await sheet.getRange(2, 1, oldLastRow - 1, existingHeaders.length).getValues()
          : [];

        await sheet.clear();
        await sheet.getRange(1, 1, 1, HC_HEADERS.length).setValues([HC_HEADERS]);

        for (const old of oldData) {
          if (!old[0]) continue;
          const migratedRow = [
            old[0], old[1], old[2],
            old[5] || false, old[3] || "", old[4] || "",
            old[6] || false, old[3] || "", old[4] || "",
            old[9] || false, old[7] || "", old[8] || "",
            old[10] || false, old[7] || "", old[8] || "",
            old[13] || false, old[11] || "", old[12] || "",
            old[14] || false, old[11] || "", old[12] || "",
            old[17] || false, old[15] || "", old[16] || "",
            old[18] || false, old[15] || "", old[16] || "",
            old[19] || new Date().toISOString(),
          ];
          await sheet.appendRow(migratedRow);
        }
      }
    }

    const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    let beneficiaryName = "", region = "";
    if (enrolledExists) {
      const enrolled = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
      const eRange = await enrolled.getDataRange();
      const eData = await eRange.getValues();
      const eHeaders = eData[0];
      const idIdx = eHeaders.indexOf("id_number");
      const fnIdx = eHeaders.indexOf("first_name");
      const mnIdx = eHeaders.indexOf("middle_name");
      const lnIdx = eHeaders.indexOf("last_name");
      const rgIdx = eHeaders.indexOf("region");
      for (let i = 1; i < eData.length; i++) {
        if (eData[i][idIdx] === data.id_number) {
          beneficiaryName = [eData[i][fnIdx], eData[i][mnIdx], eData[i][lnIdx]].filter(Boolean).join(" ");
          region = eData[i][rgIdx] || "";
          break;
        }
      }
    }

    const parseDate = (d) => {
      try {
        return d ? new Date(d).toISOString() : "";
      } catch (e) {
        return "";
      }
    };

    const rowData = [
      data.id_number, beneficiaryName, region,
      data.visit1_nanay_attended || false, parseDate(data.visit1_nanay_date), data.visit1_nanay_practitioner || "",
      data.visit1_anak_attended || false, parseDate(data.visit1_anak_date), data.visit1_anak_practitioner || "",
      data.visit2_nanay_attended || false, parseDate(data.visit2_nanay_date), data.visit2_nanay_practitioner || "",
      data.visit2_anak_attended || false, parseDate(data.visit2_anak_date), data.visit2_anak_practitioner || "",
      data.visit3_nanay_attended || false, parseDate(data.visit3_nanay_date), data.visit3_nanay_practitioner || "",
      data.visit3_anak_attended || false, parseDate(data.visit3_anak_date), data.visit3_anak_practitioner || "",
      data.visit4_nanay_attended || false, parseDate(data.visit4_nanay_date), data.visit4_nanay_practitioner || "",
      data.visit4_anak_attended || false, parseDate(data.visit4_anak_date), data.visit4_anak_practitioner || "",
      new Date().toISOString(),
    ];

    const sheetRange = await sheet.getDataRange();
    const sheetData = await sheetRange.getValues();
    let targetRow = null;
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === data.id_number) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow) {
      await sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      await sheet.appendRow(rowData);
    }

    return JSON.stringify({ success: true, message: "Healthcare record saved successfully" });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.toString() });
  }
}

module.exports = saveHealthcareRecord;
