const { hashPassword } = require("../lib/crypto");
const { initializeUsersSheet, logActivity } = require("../lib/auth");
const { SETTINGS } = require("../lib/settings");

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

function validatePasswordStrength(password) {
  if (password.length < SETTINGS.PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${SETTINGS.PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain at least one number" };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }
  return { valid: true };
}

async function signup(data) {
  try {
    data.email = sanitizeInput(data.email);
    data.name = sanitizeInput(data.name);

    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      return JSON.stringify({ success: false, message: passwordValidation.message });
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const existingData = await range.getValues();

    for (let i = 1; i < existingData.length; i++) {
      if (
        existingData[i][0] &&
        existingData[i][0].toString().toLowerCase() === data.email.toLowerCase()
      ) {
        return JSON.stringify({ success: false, message: "Email already registered" });
      }
    }

    const passwordData = hashPassword(data.password);
    const timestamp = new Date().toISOString();

    await usersSheet.appendRow([
      data.email,
      passwordData.hash,
      passwordData.salt,
      data.name,
      data.role || SETTINGS.USER_ROLES.CASE_MANAGER,
      data.region || "",
      timestamp,
      timestamp,
      0,
      "",
      true,
      "active",
    ]);

    await logActivity("USER_CREATED", { email: data.email, role: data.role });

    return JSON.stringify({
      success: true,
      message: "Account created successfully",
      user: {
        email: data.email,
        name: data.name,
        role: data.role || SETTINGS.USER_ROLES.CASE_MANAGER,
        region: data.region || "",
      },
    });
  } catch (error) {
    return JSON.stringify({ success: false, message: "Error: " + error.toString() });
  }
}

module.exports = signup;
