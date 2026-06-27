const {
  getRegionsList,
  getBarangayList,
  getActivityLogs,
  getDataChangeTimestamp,
  generateReport,
} = require("./ported/reports");

module.exports = {
  generateReport,
  getActivityLogs,
  getRegionsList,
  getBarangayList,
  getDataChangeTimestamp,
};
