const sheets = require("../lib/sheetsClient");
const { SETTINGS } = require("../lib/settings");
const { isRowEmpty, getActualLastRow } = require("../lib/helpers");
const { checkSessionAndGetUser } = require("../lib/auth");
const {
  normalizeRegionCode,
  isAmisProgramRegion,
  createAmisRegionCounter,
  createAmisSessionStatsByRegion,
} = require("../lib/amisRegions");

function getEmptyStats() {
  const emptySessionStats = { all: { present: 0, absent: 0, exempted: 0, totalMarked: 0 } };
  for (let i = 1; i <= 24; i++) {
    emptySessionStats[`M${i}`] = { present: 0, absent: 0, exempted: 0, totalMarked: 0 };
  }

  return {
    totalEnrolled: 0,
    ageGroups: {},
    ageGroupsAtRegistration: {},
    ageGroupsByRegion: {},
    ageGroupsByRegionAtRegistration: {},
    locations: {},
    genderDistribution: { Male: 0, Female: 0 },
    monthlyTrend: [],
    sessionCompletion: 0,
    regionTotals: createAmisRegionCounter(),
    sessionStats: emptySessionStats,
    sessionStatsByRegion: createAmisSessionStatsByRegion(),
    overallAttendanceSummary: { present: 0, absent: 0, exempted: 0, totalMarked: 0 },
    lastUpdated: new Date().toISOString(),
  };
}

async function getAttendanceData(ss) {
  const exists = await ss.sheetExists("session_attendance");
  if (!exists) return null;
  const sheet = ss.getSheetByName("session_attendance");
  const lastRow = await sheet.getLastRow();
  if (lastRow <= 1) return null;
  const lastCol = await sheet.getLastColumn();
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

async function calculateSessionCompletion(ss, enrolledData, colIndices) {
  try {
    const attData = await getAttendanceData(ss);
    if (!attData) return 0;

    let totalPresent = 0, totalMarked = 0;
    for (let i = 0; i < attData.length; i++) {
      const idNumber = attData[i][0];
      if (!idNumber) continue;
      const isInFiltered = enrolledData.some(
        (row) =>
          row[colIndices.id] === idNumber &&
          isAmisProgramRegion(row[colIndices.region]),
      );
      if (!isInFiltered) continue;

      for (let m = 1; m <= 24; m++) {
        const attendanceCol = (m - 1) * 2 + 2;
        if (attendanceCol < attData[i].length) {
          const status = attData[i][attendanceCol];
          if (status === "Present") {
            totalPresent++;
            totalMarked++;
          } else if (status === "Absent") {
            totalMarked++;
          }
        }
      }
    }
    return totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
  } catch (error) {
    return 0;
  }
}

async function calculateDetailedSessionStats(ss, enrolledData, colIndices, isAdmin, userRegion) {
  const sessionStats = { all: { present: 0, absent: 0, exempted: 0, totalMarked: 0 } };
  for (let i = 1; i <= 24; i++) {
    sessionStats[`M${i}`] = { present: 0, absent: 0, exempted: 0, totalMarked: 0 };
  }

  try {
    const attData = await getAttendanceData(ss);
    if (!attData) return sessionStats;

    const filteredIds = new Set();
    for (let i = 1; i < enrolledData.length; i++) {
      const row = enrolledData[i];
      if (!row[colIndices.id] || isRowEmpty(row)) continue;
      const rowRegionRaw = row[colIndices.region];
      if (!isAmisProgramRegion(rowRegionRaw)) continue;
      if (!isAdmin && userRegion && userRegion !== "ALL") {
        const rowRegion = normalizeRegionCode(rowRegionRaw);
        if (rowRegion !== normalizeRegionCode(userRegion)) continue;
      }
      filteredIds.add(String(row[colIndices.id]));
    }

    for (let i = 0; i < attData.length; i++) {
      const idNumber = String(attData[i][0]);
      if (!idNumber || !filteredIds.has(idNumber)) continue;

      for (let m = 1; m <= 24; m++) {
        const attendanceCol = (m - 1) * 2 + 2;
        if (attendanceCol < attData[i].length) {
          const status = attData[i][attendanceCol];
          const key = `M${m}`;
          if (status === "Present") {
            sessionStats[key].present++; sessionStats[key].totalMarked++;
            sessionStats.all.present++; sessionStats.all.totalMarked++;
          } else if (status === "Absent") {
            sessionStats[key].absent++; sessionStats[key].totalMarked++;
            sessionStats.all.absent++; sessionStats.all.totalMarked++;
          } else if (status === "Exempted") {
            sessionStats[key].exempted++; sessionStats[key].totalMarked++;
            sessionStats.all.exempted++; sessionStats.all.totalMarked++;
          }
        }
      }
    }
    return sessionStats;
  } catch (error) {
    return { all: { present: 0, absent: 0, exempted: 0, totalMarked: 0 } };
  }
}

async function calculateSessionStatsByRegion(ss, enrolledData, colIndices) {
  const result = createAmisSessionStatsByRegion();

  try {
    const attData = await getAttendanceData(ss);
    if (!attData) return result;

    const idRegionMap = {};
    for (let i = 1; i < enrolledData.length; i++) {
      const row = enrolledData[i];
      if (!row[colIndices.id] || isRowEmpty(row)) continue;
      const region = colIndices.region !== -1 ? normalizeRegionCode(row[colIndices.region]) : "";
      if (!isAmisProgramRegion(region)) continue;
      idRegionMap[row[colIndices.id]] = region;
    }

    for (let i = 0; i < attData.length; i++) {
      const idNumber = attData[i][0];
      if (!idNumber) continue;
      const region = idRegionMap[idNumber];
      if (!region || !result[region]) continue;

      for (let m = 1; m <= 24; m++) {
        const attendanceCol = (m - 1) * 2 + 2;
        if (attendanceCol < attData[i].length) {
          const status = attData[i][attendanceCol];
          const key = `M${m}`;
          if (status === "Present") {
            result[region][key].present++; result[region][key].totalMarked++;
            result[region].all.present++; result[region].all.totalMarked++;
          } else if (status === "Absent") {
            result[region][key].absent++; result[region][key].totalMarked++;
            result[region].all.absent++; result[region].all.totalMarked++;
          } else if (status === "Exempted") {
            result[region][key].exempted++; result[region][key].totalMarked++;
            result[region].all.exempted++; result[region].all.totalMarked++;
          }
        }
      }
    }
    return result;
  } catch (error) {
    return {};
  }
}

async function calculateOverallAttendanceSummary(ss, enrolledData, colIndices, filterRegion) {
  try {
    const attData = await getAttendanceData(ss);
    if (!attData) return { present: 0, absent: 0, exempted: 0, totalMarked: 0 };

    const enrolledIds = new Set();
    for (let i = 1; i < enrolledData.length; i++) {
      const row = enrolledData[i];
      if (!row[colIndices.id] || isRowEmpty(row)) continue;
      const rowRegion = normalizeRegionCode(row[colIndices.region]);
      if (!isAmisProgramRegion(rowRegion)) continue;
      if (filterRegion && rowRegion !== normalizeRegionCode(filterRegion)) continue;
      enrolledIds.add(String(row[colIndices.id]));
    }

    const sessionTotals = {};
    for (let m = 1; m <= 24; m++) {
      sessionTotals[m] = { present: 0, absent: 0, exempted: 0, totalMarked: 0 };
    }

    for (let i = 0; i < attData.length; i++) {
      const rowId = String(attData[i][0]);
      if (!rowId || !enrolledIds.has(rowId)) continue;

      for (let m = 1; m <= 24; m++) {
        const attendanceCol = (m - 1) * 2 + 2;
        if (attendanceCol < attData[i].length) {
          const status = attData[i][attendanceCol];
          if (status === "Present") { sessionTotals[m].present++; sessionTotals[m].totalMarked++; }
          else if (status === "Absent") { sessionTotals[m].absent++; sessionTotals[m].totalMarked++; }
          else if (status === "Exempted") { sessionTotals[m].exempted++; sessionTotals[m].totalMarked++; }
        }
      }
    }

    let totalPresent = 0, totalAbsent = 0, totalExempted = 0, totalMarked = 0, sessionsWithData = 0;
    for (let m = 1; m <= 24; m++) {
      if (sessionTotals[m].totalMarked > 0) {
        totalPresent += sessionTotals[m].present;
        totalAbsent += sessionTotals[m].absent;
        totalExempted += sessionTotals[m].exempted;
        totalMarked += sessionTotals[m].totalMarked;
        sessionsWithData++;
      }
    }

    if (sessionsWithData === 0) {
      return { present: 0, absent: 0, exempted: 0, totalMarked: 0, attendancePercentage: 0 };
    }

    return {
      present: Math.round(totalPresent / sessionsWithData),
      absent: Math.round(totalAbsent / sessionsWithData),
      exempted: Math.round(totalExempted / sessionsWithData),
      totalMarked: Math.round(totalMarked / sessionsWithData),
      attendancePercentage: parseFloat(((totalPresent / totalMarked) * 100).toFixed(1)),
    };
  } catch (e) {
    return { present: 0, absent: 0, exempted: 0, totalMarked: 0 };
  }
}

async function getDashboardStats(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const isAdmin = currentUser.role === SETTINGS.USER_ROLES.ADMIN;
    const userRegion = currentUser.region;

    const ss = sheets.getActive();
    const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.RESPONSES);
    if (!exists) return JSON.stringify({ success: true, stats: getEmptyStats() });

    const enrolledSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.RESPONSES);
    const actualLastRow = await getActualLastRow(enrolledSheet);
    if (actualLastRow < 2) return JSON.stringify({ success: true, stats: getEmptyStats() });

    const lastCol = await enrolledSheet.getLastColumn();
    const data = await enrolledSheet.getRange(1, 1, actualLastRow, lastCol).getValues();
    const headers = data[0];

    const colIndices = {
      dob: headers.indexOf("date_birth"),
      sex: headers.indexOf("sex"),
      municipality: headers.indexOf("municipality_city"),
      region: headers.indexOf("region"),
      barangay: headers.indexOf("barangay"),
      id: headers.indexOf("id_number"),
      dateRegistered: headers.indexOf("date_registered"),
    };

    const today = new Date();
    const stats = {
      totalEnrolled: 0,
      ageGroups: {},
      ageGroupsAtRegistration: {},
      ageGroupsByRegion: {},
      ageGroupsByRegionAtRegistration: {},
      locations: {},
      genderDistribution: { Male: 0, Female: 0 },
      monthlyTrend: [],
      sessionCompletion: 0,
      regionTotals: createAmisRegionCounter(),
      sessionStats: null,
      lastUpdated: new Date().toISOString(),
    };

    const monthlyData = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[colIndices.id] || isRowEmpty(row)) continue;
      const rowRegion = colIndices.region !== -1 ? normalizeRegionCode(row[colIndices.region]) : "";
      if (!isAmisProgramRegion(rowRegion)) continue;

      if (!isAdmin && userRegion !== "ALL" && colIndices.region !== -1) {
        if (rowRegion !== normalizeRegionCode(userRegion)) continue;
      }

      stats.totalEnrolled++;

      if (colIndices.dob !== -1 && row[colIndices.dob]) {
        const dob = new Date(row[colIndices.dob]);

        let ageToday = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ageToday--;
        if (ageToday >= 9 && ageToday <= 100) {
          stats.ageGroups[ageToday] = (stats.ageGroups[ageToday] || 0) + 1;
        }

        if (rowRegion) {
          const region = rowRegion;
          if (!stats.ageGroupsByRegion[region]) stats.ageGroupsByRegion[region] = {};
          stats.ageGroupsByRegion[region][ageToday] = (stats.ageGroupsByRegion[region][ageToday] || 0) + 1;
        }

        if (colIndices.dateRegistered !== -1 && row[colIndices.dateRegistered]) {
          const dateRegistered = new Date(row[colIndices.dateRegistered]);
          let ageAtReg = dateRegistered.getFullYear() - dob.getFullYear();
          const monthDiffReg = dateRegistered.getMonth() - dob.getMonth();
          if (monthDiffReg < 0 || (monthDiffReg === 0 && dateRegistered.getDate() < dob.getDate())) ageAtReg--;
          if (ageAtReg >= 9 && ageAtReg <= 100) {
            stats.ageGroupsAtRegistration[ageAtReg] = (stats.ageGroupsAtRegistration[ageAtReg] || 0) + 1;
          }

          if (rowRegion) {
            const region = rowRegion;
            if (!stats.ageGroupsByRegionAtRegistration[region]) stats.ageGroupsByRegionAtRegistration[region] = {};
            stats.ageGroupsByRegionAtRegistration[region][ageAtReg] =
              (stats.ageGroupsByRegionAtRegistration[region][ageAtReg] || 0) + 1;
          }
        }
      }

      if (colIndices.sex !== -1 && (row[colIndices.sex] === "Male" || row[colIndices.sex] === "Female")) {
        stats.genderDistribution[row[colIndices.sex]]++;
      }

      if (colIndices.municipality !== -1 && row[colIndices.municipality]) {
        const location = row[colIndices.municipality];
        stats.locations[location] = (stats.locations[location] || 0) + 1;
      }

      if (stats.regionTotals[rowRegion] !== undefined) stats.regionTotals[rowRegion]++;

      if (colIndices.id !== -1 && row[colIndices.id]) {
        const id = row[colIndices.id].toString();
        const match = id.match(/^PTN-(\d{2})(\d{2})-\d{6}$/);
        if (match) {
          const period = match[1] + match[2];
          monthlyData[period] = (monthlyData[period] || 0) + 1;
        }
      }
    }

    stats.barangayAgeStats = null;
    stats.barangaySessionStats = null;

    stats.monthlyTrend = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, count]) => ({ period, count }));

    stats.sessionCompletion = await calculateSessionCompletion(ss, data, colIndices);
    stats.sessionStats = await calculateDetailedSessionStats(ss, data, colIndices, isAdmin, userRegion);
    stats.sessionStatsByRegion = await calculateSessionStatsByRegion(ss, data, colIndices);
    stats.overallAttendanceSummary = await calculateOverallAttendanceSummary(
      ss, data, colIndices, isAdmin ? null : userRegion,
    );

    return JSON.stringify({ success: true, stats });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

module.exports = getDashboardStats;
