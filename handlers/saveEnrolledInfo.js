const sheets = require("../lib/sheetsClient");
const { SETTINGS } = require("../lib/settings");
const { getActualLastRow, sanitizeInput } = require("../lib/helpers");
const { checkSessionAndGetUser, logActivity } = require("../lib/auth");

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

const AG_HEADERS = [
  "ID Number", "Beneficiary Full Name", "Municipality/City", "Barangay",
  "First Authorized Grantee", "First Authorized Grantee Relationship",
  "First Authorized Grantee Contact Number", "First Authorized Grantee Address",
  "Second Authorized Grantee", "Second Authorized Grantee Relationship",
  "Second Authorized Grantee Contact Number", "Second Authorized Grantee Address",
];

async function initSheet(ss, name, headerRow) {
  const exists = await ss.sheetExists(name);
  if (!exists) {
    const sheet = await ss.insertSheet(name);
    await sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    return sheet;
  }
  return ss.getSheetByName(name);
}

async function saveEnrolledInfo(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string" && key !== "childrenData") {
        data[key] = sanitizeInput(data[key]);
      }
    });

    const ss = sheets.getActive();
    const enrolledExists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!enrolledExists) return JSON.stringify({ success: false, message: "No enrolled records found" });

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const infoSheet = await initSheet(ss, "am_enrolled_info", INFO_HEADERS);
    const childrenSheet = await initSheet(ss, "beneficiary_children", CHILDREN_HEADERS);

    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return JSON.stringify({ success: false, message: "No enrolled records found" });

    const lastCol = await enrolledSheet.getLastColumn();
    const enrolledData = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    let enrolledRecord = null;

    for (let i = 1; i < enrolledData.length; i++) {
      if (enrolledData[i][0] === data.idNumber) {
        enrolledRecord = {
          idNumber: enrolledData[i][0],
          firstName: enrolledData[i][1] || "",
          middleName: enrolledData[i][2] || "",
          lastName: enrolledData[i][3] || "",
          barangay: enrolledData[i][11] || "",
          municipalityCity: enrolledData[i][10] || "",
          province: enrolledData[i][9] || "",
        };
        break;
      }
    }

    if (!enrolledRecord) return JSON.stringify({ success: false, message: "ID number not found in enrolled records" });

    const fullName = `${enrolledRecord.firstName} ${enrolledRecord.middleName} ${enrolledRecord.lastName}`.trim().replace(/\s+/g, " ");
    const fullAddress = `${enrolledRecord.barangay}, ${enrolledRecord.municipalityCity}, ${enrolledRecord.province}`.trim();

    const infoActualLastRow = await getActualLastRow(infoSheet);
    let targetRow = null;
    if (infoActualLastRow >= 2) {
      const infoData = await infoSheet.getRange(1, 1, infoActualLastRow, 1).getValues();
      for (let i = 1; i < infoData.length; i++) {
        if (infoData[i][0] === data.idNumber) {
          targetRow = i + 1;
          break;
        }
      }
    }

    const values = [
      data.idNumber, fullName, fullAddress,
      data.education || "", data.educationLevelDetail || "", data.budgetExpenses || "",
      data.hasDisability || "No", data.disabilityType || "", data.disabilitySpecify || "",
      data.hasIllness || "No", data.illnessType || "", data.illnessSpecify || "",
    ];

    if (targetRow) {
      await infoSheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
    } else {
      await infoSheet.appendRow(values);
    }

    if (data.childrenData && data.childrenData.length > 0) {
      const childrenLastRow = await childrenSheet.getLastRow();
      const childrenData = childrenLastRow > 1
        ? await childrenSheet.getRange(1, 1, childrenLastRow, await childrenSheet.getLastColumn()).getValues()
        : [];
      for (let i = childrenData.length - 1; i >= 1; i--) {
        if (childrenData[i][0] === data.idNumber) {
          await childrenSheet.deleteRow(i + 1);
        }
      }

      for (const child of data.childrenData) {
        const childRow = [
          data.idNumber, fullName, fullAddress,
          child.name || "", child.birthdate || "", child.sex || "",
          child.newbornScreening || "", child.newbornScreeningNotes || "",
          child.eyeProphylaxis || "", child.eyeProphylaxisNotes || "",
          child.vitaminKSupplementation || "", child.vitaminKSupplementationNotes || "",
          child.bcgVaccine || "", child.bcgVaccineNotes || "",
          child.diphtheriaVaccine || "", child.diphtheriaVaccineNotes || "",
          child.oralPolioVaccine || "", child.oralPolioVaccineNotes || "",
          child.hepatitisB || "", child.hepatitisBNotes || "",
          child.growthMonitoring || "", child.growthMonitoringNotes || "",
          child.oralHealthServices || "", child.oralHealthServicesNotes || "",
          child.hasDisability || "No", child.disabilityType || "", child.disabilitySpecify || "",
          child.hasIllness || "No", child.illnessType || "", child.illnessSpecify || "",
        ];
        await childrenSheet.appendRow(childRow);
      }
    }

    if (data.incomeData && data.incomeData.length > 0) {
      const incomeSheet = await initSheet(ss, "financial_income", [
        "Beneficiary ID Number", "Beneficiary Name", "Beneficiary Address", "Person Name",
        "Relationship to Beneficiary", "Income Source", "Income Source Specify",
        "Monthly Income (Amount)", "Combined Monthtly Total (Amount)",
      ]);

      const incomeLastRow = await incomeSheet.getLastRow();
      const incomeData = incomeLastRow > 1
        ? await incomeSheet.getRange(1, 1, incomeLastRow, await incomeSheet.getLastColumn()).getValues()
        : [];
      for (let i = incomeData.length - 1; i >= 1; i--) {
        if (incomeData[i][0] === data.idNumber) {
          await incomeSheet.deleteRow(i + 1);
        }
      }

      let combinedTotal = 0;
      data.incomeData.forEach((income) => {
        combinedTotal += parseFloat(income.incomeAmount) || 0;
      });

      for (const income of data.incomeData) {
        await incomeSheet.appendRow([
          data.idNumber, fullName, fullAddress,
          income.personName || "", income.relationship || "",
          income.incomeSource || "", income.incomeSourceSpecify || "",
          income.incomeAmount || "", combinedTotal,
        ]);
      }
    }

    let agSheet = await initSheet(ss, "authorized_grantee", AG_HEADERS);
    const currentHeaders = (await agSheet.getRange(1, 1, 1, await agSheet.getLastColumn()).getValues())[0];
    if (currentHeaders[2] === "Address" || currentHeaders[2] === "Region") {
      await agSheet.clearContents();
      await agSheet.getRange(1, 1, 1, AG_HEADERS.length).setValues([AG_HEADERS]);
    }

    const agLastRow = await agSheet.getLastRow();
    const agAllData = agLastRow > 1 ? await agSheet.getRange(1, 1, agLastRow, 12).getValues() : [];
    let agTargetRow = null;
    for (let i = 1; i < agAllData.length; i++) {
      if (agAllData[i][0] === data.idNumber) {
        agTargetRow = i + 1;
        break;
      }
    }

    const agRow = [
      data.idNumber, fullName, enrolledRecord.municipalityCity, enrolledRecord.barangay,
      data.authorizedGrantee || "", data.granteeRelationship || "",
      data.granteeContactNumber || "", data.granteeAddress || "",
      data.authorizedGrantee2 || "", data.granteeRelationship2 || "",
      data.granteeContactNumber2 || "", data.granteeAddress2 || "",
    ];

    if (agTargetRow) {
      await agSheet.getRange(agTargetRow, 1, 1, 12).setValues([agRow]);
    } else {
      await agSheet.appendRow(agRow);
    }

    await logActivity(
      targetRow ? "ENROLLED_INFO_UPDATED" : "ENROLLED_INFO_CREATED",
      {
        idNumber: data.idNumber,
        name: fullName,
        user: currentUser.email,
        childrenCount: data.childrenData ? data.childrenData.length : 0,
      },
      currentUser,
    );

    return JSON.stringify({ success: true, message: "Information saved successfully" });
  } catch (error) {
    return JSON.stringify({ success: false, message: "Error: " + error.toString() });
  }
}

module.exports = saveEnrolledInfo;
