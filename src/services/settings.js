const SETTINGS = {
  APP_NAME: "AMIS",
  SHEET_NAME: {
    SOURCE: "am_db",
    RESPONSES: "am_enrolled",
    USERS: "users",
    ACTIVITY_LOG: "activity_log",
  },
  HEADERS: [
    { key: "id", value: "id_number" },
    { key: "first_name", value: "first_name" },
    { key: "middle_name", value: "middle_name" },
    { key: "last_name", value: "last_name" },
    { key: "date_birth", value: "date_birth" },
    { key: "sex", value: "sex" },
    { key: "civil_status", value: "civil_status" },
    { key: "contact_number", value: "contact_number" },
    { key: "region", value: "region" },
    { key: "province", value: "province" },
    { key: "municipality_city", value: "municipality_city" },
    { key: "barangay", value: "barangay" },
    { key: "has_child", value: "has_child" },
    { key: "children_number", value: "children_number" },
    { key: "living_partner", value: "living_partner" },
    { key: "date_registered", value: "date_registered" },
  ],
  USER_ROLES: {
    ADMIN: "admin",
    CASE_MANAGER: "case_manager",
  },
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT: 7200000,
  SESSION_CHECK_INTERVAL: 60000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 900000,
  VALID_REGIONS: [
    "I", "II", "III", "IV-A", "IV-B", "V", "VI", "VII", "VIII",
    "IX", "X", "XI", "XII", "XIII", "NCR", "CAR", "BARMM",
  ],
  REGION_MAP: {
    I: "01", II: "02", III: "03", "IV-A": "04", "IV-B": "17", V: "05",
    VI: "06", VII: "07", VIII: "08", IX: "09", X: "10", XI: "11",
    XII: "12", XIII: "13", NCR: "14", CAR: "15", BARMM: "16",
  },
};

module.exports = { SETTINGS };
