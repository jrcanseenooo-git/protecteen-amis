const sheets = require("../../models/sheetsClient");
const { SETTINGS } = require("../../services/settings");
const { isRowEmpty, getActualLastRow, formatDate } = require("../../services/helpers");
const { checkSessionAndGetUser, initializeActivityLogSheet, logActivity } = require("../../services/auth");
const { normalizeRegionCode, isAmisProgramRegion } = require("../../services/amisRegions");

// Note: matches the original exactly — getRegionsList has no session
// check in Code.gs either.
async function getRegionsList() {
  try {
    const ss = sheets.getActive();
    const regions = new Set();
    const addRegion = (value) => {
      const region = normalizeRegionCode(value);
      if (isAmisProgramRegion(region)) {
        regions.add(region);
      }
    };

    for (const sheetName of [SETTINGS.SHEET_NAME.RESPONSES, SETTINGS.SHEET_NAME.SOURCE]) {
      const exists = await ss.sheetExists(sheetName);
      if (!exists) continue;
      const sheet = ss.getSheetByName(sheetName);
      const lastRow = await sheet.getLastRow();
      if (lastRow <= 1) continue;

      const actualLastRow = await getActualLastRow(sheet);
      if (actualLastRow <= 1) continue;

      const lastCol = await sheet.getLastColumn();
      const data = await sheet.getRange(1, 1, actualLastRow, lastCol).getValues();
      const headers = data[0];
      const regionIndex = headers.indexOf("region");
      if (regionIndex === -1) continue;

      for (let i = 1; i < data.length; i++) {
        if (!isRowEmpty(data[i]) && data[i][regionIndex]) {
          addRegion(data[i][regionIndex]);
        }
      }
    }

    const locationExists = await ss.sheetExists("LocationDB");
    if (locationExists) {
      const locationSheet = ss.getSheetByName("LocationDB");
      const actualLastRow = await getActualLastRow(locationSheet);
      if (actualLastRow > 1) {
        const data = await locationSheet.getRange(2, 1, actualLastRow - 1, 1).getValues();
        for (let i = 0; i < data.length; i++) {
          addRegion(data[i][0]);
        }
      }
    }

    return JSON.stringify({ success: true, regions: Array.from(regions).sort() });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString(), regions: [] });
  }
}

async function getBarangayList(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) return JSON.stringify({ success: true, barangays: [] });

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return JSON.stringify({ success: true, barangays: [] });

    const lastCol = await enrolledSheet.getLastColumn();
    const data = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = data[0];
    const regionIndex = headers.indexOf("region");
    const barangayIndex = headers.indexOf("barangay");
    const idIndex = headers.indexOf("id_number");

    if (barangayIndex === -1) return JSON.stringify({ success: true, barangays: [] });

    const isAdmin = currentUser.role === SETTINGS.USER_ROLES.ADMIN;
    const userRegion = currentUser.region;
    const barangays = new Set();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[idIndex] || isRowEmpty(row)) continue;
      if (!isAdmin && userRegion !== "ALL" && regionIndex !== -1) {
        const rowRegion = (row[regionIndex] || "").toLowerCase();
        if (rowRegion !== userRegion.toLowerCase()) continue;
      }
      const brgy = (row[barangayIndex] || "").toString().trim();
      if (brgy) barangays.add(brgy);
    }

    return JSON.stringify({ success: true, barangays: Array.from(barangays).sort() });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString(), barangays: [] });
  }
}

async function getActivityLogs(limit, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (currentUser.role !== SETTINGS.USER_ROLES.ADMIN) {
      return JSON.stringify({ success: false, message: "Access denied. Admin only." });
    }

    limit = limit || 100;

    const logSheet = await initializeActivityLogSheet();
    const range = await logSheet.getDataRange();
    const data = await range.getValues();

    if (data.length < 2) return JSON.stringify({ success: true, logs: [] });

    const logs = [];
    const startRow = Math.max(1, data.length - limit);
    for (let i = startRow; i < data.length; i++) {
      logs.push({
        timestamp: formatDate(new Date(data[i][0]), "yyyy-MM-dd HH:mm:ss"),
        userEmail: data[i][1],
        role: data[i][2],
        action: data[i][3],
        details: data[i][4],
      });
    }

    return JSON.stringify({ success: true, logs: logs.reverse() });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

async function getDataChangeTimestamp(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) {
      return JSON.stringify({ success: true, lastModified: new Date().toISOString(), recordCount: 0 });
    }

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);

    return JSON.stringify({
      success: true,
      lastModified: new Date().toISOString(),
      recordCount: Math.max(0, actualLastRow - 1),
    });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

function generateAgeDistributionReport(data, headers) {
  const dobIndex = headers.indexOf("date_birth");
  const ageGroups = { "9-12": 0, "13-14": 0, "15-17": 0, "18-19": 0, "20+": 0 };
  const today = new Date();

  data.forEach((row) => {
    if (dobIndex !== -1 && row[dobIndex]) {
      const dob = new Date(row[dobIndex]);
      const age = today.getFullYear() - dob.getFullYear();
      if (age >= 9 && age <= 12) ageGroups["9-12"]++;
      else if (age >= 13 && age <= 14) ageGroups["13-14"]++;
      else if (age >= 15 && age <= 17) ageGroups["15-17"]++;
      else if (age >= 18 && age <= 19) ageGroups["18-19"]++;
      else if (age >= 20) ageGroups["20+"]++;
    }
  });

  return Object.entries(ageGroups).map(([group, count]) => ({
    ageGroup: group,
    count,
    percentage: data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0,
  }));
}

function generateLocationSummaryReport(data, headers) {
  const municipalityIndex = headers.indexOf("municipality_city");
  const locations = {};

  data.forEach((row) => {
    if (municipalityIndex !== -1 && row[municipalityIndex]) {
      const location = row[municipalityIndex];
      locations[location] = (locations[location] || 0) + 1;
    }
  });

  return Object.entries(locations)
    .map(([location, count]) => ({
      location,
      count,
      percentage: data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function generateMonthlyEnrollmentReport(data, headers) {
  const idIndex = headers.indexOf("id_number");
  const regionIndex = headers.indexOf("region");
  const monthlyData = {};

  data.forEach((row) => {
    const id = row[idIndex]?.toString().trim();
    const regionRaw = row[regionIndex]?.toString().trim();
    if (!id || !regionRaw) return;

    const regionCode = SETTINGS.REGION_MAP[regionRaw];
    if (!regionCode) return;

    const match = id.match(/^PTN-(\d{2})(\d{2})-\d{6}$/);
    if (!match) return;

    const idRegion = match[1];
    const idYear = match[2];
    if (idRegion !== regionCode) return;

    const regionYear = idRegion + idYear;
    monthlyData[regionYear] = (monthlyData[regionYear] || 0) + 1;
  });

  return Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, count]) => ({ period, count }));
}

function generateGenderDistributionReport(data, headers) {
  const sexIndex = headers.indexOf("sex");
  const genderCounts = { Male: 0, Female: 0 };

  data.forEach((row) => {
    if (sexIndex !== -1 && row[sexIndex]) {
      const gender = row[sexIndex];
      if (genderCounts[gender] !== undefined) genderCounts[gender]++;
    }
  });

  return Object.entries(genderCounts).map(([gender, count]) => ({
    gender,
    count,
    percentage: data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0,
  }));
}

async function generateReport(reportType, filters, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const isAdmin = currentUser.role === SETTINGS.USER_ROLES.ADMIN;
    const userRegion = currentUser.region;

    filters = filters || {};
    if (typeof filters === "string") filters = JSON.parse(filters);

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) return JSON.stringify({ success: true, reportData: [] });

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return JSON.stringify({ success: true, reportData: [] });

    const lastCol = await enrolledSheet.getLastColumn();
    const data = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = data[0];
    const idIndex = headers.indexOf("id_number");

    let filteredData = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[idIndex] || row[idIndex] === "") continue;
      if (isRowEmpty(row)) continue;
      filteredData.push(row);
    }

    const regionIndex = headers.indexOf("region");
    if (!isAdmin && userRegion !== "ALL" && regionIndex !== -1) {
      filteredData = filteredData.filter((row) => (row[regionIndex] || "").toLowerCase() === userRegion.toLowerCase());
    }
    if (filters.region && regionIndex !== -1) {
      filteredData = filteredData.filter((row) => (row[regionIndex] || "").toLowerCase() === filters.region.toLowerCase());
    }
    if (filters.startDate && filters.endDate) {
      const dobIndex = headers.indexOf("date_birth");
      if (dobIndex !== -1) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        filteredData = filteredData.filter((row) => {
          if (row[dobIndex]) {
            const dob = new Date(row[dobIndex]);
            return dob >= startDate && dob <= endDate;
          }
          return false;
        });
      }
    }

    let reportData = [];
    switch (reportType) {
      case "age_distribution":
        reportData = generateAgeDistributionReport(filteredData, headers);
        break;
      case "location_summary":
        reportData = generateLocationSummaryReport(filteredData, headers);
        break;
      case "monthly_enrollment":
        reportData = generateMonthlyEnrollmentReport(filteredData, headers);
        break;
      case "gender_distribution":
        reportData = generateGenderDistributionReport(filteredData, headers);
        break;
      default:
        reportData = [];
    }

    await logActivity("REPORT_GENERATED", { reportType, filters }, currentUser);

    return JSON.stringify({ success: true, reportData });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

module.exports = {
  getRegionsList,
  getBarangayList,
  getActivityLogs,
  getDataChangeTimestamp,
  generateReport,
};
