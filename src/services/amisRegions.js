const AMIS_PROGRAM_REGIONS = ["NCR", "III", "VI", "X"];

function normalizeRegionCode(region) {
  return (region || "").toString().trim().toUpperCase();
}

function isAmisProgramRegion(region) {
  return AMIS_PROGRAM_REGIONS.includes(normalizeRegionCode(region));
}

function createAmisRegionCounter() {
  return AMIS_PROGRAM_REGIONS.reduce((counter, region) => {
    counter[region] = 0;
    return counter;
  }, {});
}

function createAmisSessionStatsByRegion() {
  const result = {};
  AMIS_PROGRAM_REGIONS.forEach((region) => {
    result[region] = {
      all: { present: 0, absent: 0, exempted: 0, totalMarked: 0 },
    };
    for (let i = 1; i <= 24; i++) {
      result[region][`M${i}`] = {
        present: 0,
        absent: 0,
        exempted: 0,
        totalMarked: 0,
      };
    }
  });
  return result;
}

module.exports = {
  AMIS_PROGRAM_REGIONS,
  normalizeRegionCode,
  isAmisProgramRegion,
  createAmisRegionCounter,
  createAmisSessionStatsByRegion,
};
