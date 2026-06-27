const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { getActualLastRow, formatDate } = require("../../services/helpers");
const { checkSessionAndGetUser } = require("../../services/auth");

const INFO_HEADERS = [
  "ID Number", "Full Name", "Address", "Education", "Education Level Detail",
  "Budget Expenses", "Has Disability", "Disability Type", "Disability Specify",
  "Has Illness", "Illness Type", "Illness Specify",
];

const CHILDREN_HEADERS = [
  "Beneficiary ID Number", "Beneficiary Name", "Beneficiary Address", "Child Name",
  "Child Birthdate", "Child Sex", "Newborn Screening Date", "Newborn Screening Notes",
  "Eye Prophylaxis Date", "Eye Prophylaxis Notes", "Vitamin K Supplementation Date",
  "Vitamin K Supplementation Notes", "BCG Vaccine Date", "BCG Vaccine Notes",
  "Diphtheria Pertussis Tetanus Date", "Diphtheria Pertussis Tetanus Notes",
  "Oral Polio Vaccine Date", "Oral Polio Vaccine Notes", "Hepatitis B Date",
  "Hepatitis B Notes", "Growth Development Monitoring Date", "Growth Development Monitoring Notes",
  "Oral Health Services Date", "Oral Health Services Notes", "Has Disability",
  "Disability Type", "Disability Specify", "Has Illness", "Illness Type", "Illness Specify",
];

async function initializeEnrolledInfoSheet() {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("am_enrolled_info");
  if (!exists) {
    const sheet = await ss.insertSheet("am_enrolled_info");
    await sheet.getRange(1, 1, 1, INFO_HEADERS.length).setValues([INFO_HEADERS]);
  }
  return ss.getSheetByName("am_enrolled_info");
}

async function initializeBeneficiaryChildrenSheet() {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists("beneficiary_children");
  if (!exists) {
    const sheet = await ss.insertSheet("beneficiary_children");
    await sheet.getRange(1, 1, 1, CHILDREN_HEADERS.length).setValues([CHILDREN_HEADERS]);
  }
  return ss.getSheetByName("beneficiary_children");
}

async function getEnrolledRecordWithInfo(idNumber, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const ss = sheets.getActive();
    const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!enrolledExists) {
      return JSON.stringify({ success: false, message: "Enrolled sheet not found" });
    }

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const infoSheet = await initializeEnrolledInfoSheet();

    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) {
      return JSON.stringify({ success: false, message: "No records found" });
    }

    const totalCols = await enrolledSheet.getLastColumn();
    const enrolledData = await enrolledSheet.getRange(1, 1, actualLastRow, totalCols).getValues();
    const enrolledHeaders = enrolledData[0];

    let enrolledRecord = null;
    for (let i = 1; i < enrolledData.length; i++) {
      if (enrolledData[i][0] === idNumber) {
        enrolledRecord = {};
        enrolledHeaders.forEach((header, index) => {
          const value = enrolledData[i][index];
          const normalizedKey = header.toString().trim().toLowerCase().replace(/\s+/g, "_");
          enrolledRecord[normalizedKey] = value instanceof Date ? formatDate(value, "yyyy-MM-dd") : value;
        });
        break;
      }
    }

    if (!enrolledRecord) {
      return JSON.stringify({ success: false, message: "Record not found" });
    }

    let additionalInfo = null;
    const infoActualLastRow = await getActualLastRow(infoSheet);
    if (infoActualLastRow >= 2) {
      const infoLastCol = await infoSheet.getLastColumn();
      const infoData = await infoSheet.getRange(1, 1, infoActualLastRow, infoLastCol).getValues();
      for (let i = 1; i < infoData.length; i++) {
        if (infoData[i][0] === idNumber) {
          additionalInfo = {
            education: infoData[i][3] || "",
            educationLevelDetail: infoData[i][4] || "",
            budgetExpenses: infoData[i][5] || "",
            hasDisability: infoData[i][6] || "No",
            disabilityType: infoData[i][7] || "",
            disabilitySpecify: infoData[i][8] || "",
            hasIllness: infoData[i][9] || "No",
            illnessType: infoData[i][10] || "",
            illnessSpecify: infoData[i][11] || "",
            authorizedGrantee: "",
            granteeRelationship: "",
            granteeContactNumber: "",
            granteeAddress: "",
            authorizedGrantee2: "",
            granteeRelationship2: "",
            granteeContactNumber2: "",
            granteeAddress2: "",
            childrenData: [],
            incomeData: [],
          };
          break;
        }
      }
    }

    if (additionalInfo) {
      const childrenExists = await ss.sheetExists("beneficiary_children");
      if (childrenExists) {
        const childrenSheet = ss.getSheetByName("beneficiary_children");
        const childrenLastRow = await childrenSheet.getLastRow();
        const childrenData = childrenLastRow > 1
          ? await childrenSheet.getRange(1, 1, childrenLastRow, await childrenSheet.getLastColumn()).getValues()
          : [];
        const childrenList = [];

        for (let i = 1; i < childrenData.length; i++) {
          if (childrenData[i][0] === idNumber) {
            const fmt = (v) => (v ? formatDate(new Date(v), "yyyy-MM-dd") : "");
            childrenList.push({
              name: childrenData[i][3] || "",
              birthdate: fmt(childrenData[i][4]),
              sex: childrenData[i][5] || "",
              newbornScreening: fmt(childrenData[i][6]),
              newbornScreeningNotes: childrenData[i][7] || "",
              eyeProphylaxis: fmt(childrenData[i][8]),
              eyeProphylaxisNotes: childrenData[i][9] || "",
              vitaminKSupplementation: fmt(childrenData[i][10]),
              vitaminKSupplementationNotes: childrenData[i][11] || "",
              bcgVaccine: fmt(childrenData[i][12]),
              bcgVaccineNotes: childrenData[i][13] || "",
              diphtheriaVaccine: fmt(childrenData[i][14]),
              diphtheriaVaccineNotes: childrenData[i][15] || "",
              oralPolioVaccine: fmt(childrenData[i][16]),
              oralPolioVaccineNotes: childrenData[i][17] || "",
              hepatitisB: fmt(childrenData[i][18]),
              hepatitisBNotes: childrenData[i][19] || "",
              growthMonitoring: fmt(childrenData[i][20]),
              growthMonitoringNotes: childrenData[i][21] || "",
              oralHealthServices: fmt(childrenData[i][22]),
              oralHealthServicesNotes: childrenData[i][23] || "",
              hasDisability: childrenData[i][24] || "No",
              disabilityType: childrenData[i][25] || "",
              disabilitySpecify: childrenData[i][26] || "",
              hasIllness: childrenData[i][27] || "No",
              illnessType: childrenData[i][28] || "",
              illnessSpecify: childrenData[i][29] || "",
            });
          }
        }
        additionalInfo.childrenData = childrenList;
      }
    }

    if (additionalInfo) {
      const incomeExists = await ss.sheetExists("financial_income");
      if (incomeExists) {
        const incomeSheet = ss.getSheetByName("financial_income");
        const incomeLastRow = await incomeSheet.getLastRow();
        const incomeData = incomeLastRow > 1
          ? await incomeSheet.getRange(1, 1, incomeLastRow, await incomeSheet.getLastColumn()).getValues()
          : [];
        const incomeList = [];
        for (let i = 1; i < incomeData.length; i++) {
          if (incomeData[i][0] === idNumber) {
            incomeList.push({
              personName: incomeData[i][3] || "",
              relationship: incomeData[i][4] || "",
              incomeSource: incomeData[i][5] || "",
              incomeSourceSpecify: incomeData[i][6] || "",
              incomeAmount: incomeData[i][7] || "",
            });
          }
        }
        additionalInfo.incomeData = incomeList;
      }
    }

    if (additionalInfo) {
      const agExists = await ss.sheetExists("authorized_grantee");
      if (agExists) {
        const agSheet = ss.getSheetByName("authorized_grantee");
        const agLastRow = await agSheet.getLastRow();
        const agData = agLastRow > 1 ? await agSheet.getRange(1, 1, agLastRow, 12).getValues() : [];
        for (let i = 1; i < agData.length; i++) {
          if (agData[i][0] === idNumber) {
            additionalInfo.authorizedGrantee = agData[i][4] || "";
            additionalInfo.granteeRelationship = agData[i][5] || "";
            additionalInfo.granteeContactNumber = agData[i][6] || "";
            additionalInfo.granteeAddress = agData[i][7] || "";
            additionalInfo.authorizedGrantee2 = agData[i][8] || "";
            additionalInfo.granteeRelationship2 = agData[i][9] || "";
            additionalInfo.granteeContactNumber2 = agData[i][10] || "";
            additionalInfo.granteeAddress2 = agData[i][11] || "";
            break;
          }
        }
      }
    }

    let healthcareData = null;
    try {
      const hcExists = await ss.sheetExists("healthcare_data");
      if (hcExists) {
        const hcSheet = ss.getSheetByName("healthcare_data");
        const hcLastRow = await hcSheet.getLastRow();
        const hcData = hcLastRow > 1 ? await hcSheet.getRange(1, 1, hcLastRow, await hcSheet.getLastColumn()).getValues() : [];
        const hcHeaders = hcData[0];
        for (let i = 1; i < hcData.length; i++) {
          if (hcData[i][0] === idNumber) {
            healthcareData = {};
            hcHeaders.forEach((h, idx) => {
              const val = hcData[i][idx];
              healthcareData[h] = val instanceof Date ? formatDate(val, "yyyy-MM-dd") : val;
            });
            break;
          }
        }
      }
    } catch (e) {
      /* matches original's empty catch */
    }

    return JSON.stringify({ success: true, enrolledRecord, additionalInfo, healthcareData });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

module.exports = getEnrolledRecordWithInfo;
