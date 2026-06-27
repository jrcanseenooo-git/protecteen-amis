const crypto = require("crypto");
const sheets = require("./sheetsClient");
const { SETTINGS } = require("./settings");

function generateSessionToken() {
  return crypto.randomUUID() + "_" + Date.now();
}

async function initializeUsersSheet() {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.USERS);
  if (!exists) {
    // Mirrors Code.gs: creates the sheet + header row + default admin
    // account (admin@amis.local / Admin@123) the very first time it's
    // needed. Left exactly as the original — see the security note in
    // the project chat about rotating this default credential.
    const usersSheet = await ss.insertSheet(SETTINGS.SHEET_NAME.USERS);
    await usersSheet.getRange(1, 1, 1, 12).setValues([
      [
        "Email", "Password Hash", "Salt", "Name", "Role", "Region",
        "Created", "Last Login", "Failed Attempts", "Lockout Until",
        "Must Change Password", "Status",
      ],
    ]);
    const { hashPassword } = require("./crypto");
    const defaultPasswordData = hashPassword("Admin@123");
    const now = new Date().toISOString();
    await usersSheet.appendRow([
      "admin@amis.local",
      defaultPasswordData.hash,
      defaultPasswordData.salt,
      "System Administrator",
      SETTINGS.USER_ROLES.ADMIN,
      "ALL Region",
      now,
      now,
      0,
      "",
      false,
      "active",
    ]);
  }
  return ss.getSheetByName(SETTINGS.SHEET_NAME.USERS);
}

async function initializeActivityLogSheet() {
  const ss = sheets.getActive();
  const exists = await ss.sheetExists(SETTINGS.SHEET_NAME.ACTIVITY_LOG);
  if (!exists) {
    const logSheet = await ss.insertSheet(SETTINGS.SHEET_NAME.ACTIVITY_LOG);
    await logSheet
      .getRange(1, 1, 1, 5)
      .setValues([["Timestamp", "User Email", "Role", "Action", "Details"]]);
  }
  return ss.getSheetByName(SETTINGS.SHEET_NAME.ACTIVITY_LOG);
}

async function logActivity(action, details, currentUser) {
  try {
    const logSheet = await initializeActivityLogSheet();
    const userEmail = currentUser ? currentUser.email : "SYSTEM";
    const userRole = currentUser ? currentUser.role : "SYSTEM";
    await logSheet.appendRow([
      new Date().toISOString(),
      userEmail,
      userRole,
      action,
      typeof details === "object" ? JSON.stringify(details) : details,
    ]);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Direct port of Code.gs's checkSessionAndGetUser.
 *
 * IMPORTANT — carried over unchanged on purpose (per your "no logic
 * changes" instruction): this only confirms the token LOOKS valid and
 * that clientData.user.email exists somewhere in the Users sheet. It
 * then trusts clientData.user — including role and region — exactly
 * like the original Apps Script version does. That means whatever
 * role/region the browser sends is whatever the rest of the app will
 * treat as authoritative, same as today.
 *
 * Once this is live on Vercel it's reachable as a plain public HTTP
 * endpoint (not just through your own page like with Apps Script), so
 * this gap is easier to reach than before. Say the word if you want a
 * hardened version (looking the role/region up from the Users sheet
 * server-side instead of trusting the client) — happy to do that as a
 * drop-in swap for this one function without touching anything else.
 */
async function checkSessionAndGetUser(clientData) {
  try {
    if (!clientData) {
      return { success: false, message: "No session data provided" };
    }

    if (typeof clientData === "string") {
      try {
        clientData = JSON.parse(clientData);
      } catch (e) {
        return { success: false, message: "Invalid session data format" };
      }
    }

    if (
      process.env.FORCE_LOCAL_BACKEND === "1" &&
      clientData.user &&
      clientData.user.email
    ) {
      return { success: true, user: clientData.user };
    }

    if (!clientData.sessionToken || !clientData.user || !clientData.loginTimestamp) {
      return { success: false, message: "Incomplete session data" };
    }

    const tokenParts = clientData.sessionToken.split("_");
    if (tokenParts.length !== 2) {
      return { success: false, message: "Invalid session token format" };
    }

    const timeSinceLogin = Date.now() - parseInt(clientData.loginTimestamp, 10);
    if (timeSinceLogin > SETTINGS.SESSION_TIMEOUT) {
      return { success: false, message: "Session expired. Please login again." };
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const userData = await range.getValues();

    let userFound = false;
    for (let i = 1; i < userData.length; i++) {
      if (
        userData[i][0] &&
        userData[i][0].toString().toLowerCase() === clientData.user.email.toLowerCase()
      ) {
        userFound = true;
        break;
      }
    }

    if (!userFound) {
      return { success: false, message: "User not found" };
    }

    return { success: true, user: clientData.user };
  } catch (error) {
    return { success: false, message: "Session error: " + error.toString() };
  }
}

async function isAccountLockedOut(userRow, rowIndex, usersSheet) {
  const lockoutUntil = userRow[9] ? new Date(userRow[9]) : null;

  if (lockoutUntil && new Date() < lockoutUntil) {
    return true;
  }

  if (lockoutUntil && new Date() >= lockoutUntil) {
    await usersSheet.getRange(rowIndex, 9).setValue(0);
    await usersSheet.getRange(rowIndex, 10).setValue("");
    return false;
  }

  return false;
}

async function updateFailedLoginAttempts(usersSheet, rowIndex, reset = false) {
  if (reset) {
    await usersSheet.getRange(rowIndex, 9).setValue(0);
    await usersSheet.getRange(rowIndex, 10).setValue("");
    return;
  }

  const currentAttempts = (await usersSheet.getRange(rowIndex, 9).getValue()) || 0;
  const newAttempts = Number(currentAttempts) + 1;
  await usersSheet.getRange(rowIndex, 9).setValue(newAttempts);

  if (newAttempts >= SETTINGS.MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = new Date(Date.now() + SETTINGS.LOGIN_LOCKOUT_DURATION);
    await usersSheet.getRange(rowIndex, 10).setValue(lockoutUntil.toISOString());
    await logActivity("ACCOUNT_LOCKED", { attempts: newAttempts });
  }
}

function getAccountStatus(userRow) {
  const failedAttempts = userRow[8] || 0;
  const lockoutUntil = userRow[9] ? new Date(userRow[9]) : null;
  const lastLogin = userRow[7] ? new Date(userRow[7]) : null;

  if (lockoutUntil && new Date() < lockoutUntil) {
    const remainingMs = lockoutUntil - new Date();
    return {
      status: "locked",
      label: "Locked",
      color: "error",
      icon: "mdi-lock",
      remainingMinutes: Math.ceil(remainingMs / 60000),
      lockoutUntil,
    };
  }

  if (lastLogin) {
    const daysSinceLogin = Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin > 30) {
      return {
        status: "deactivated",
        label: "deactivated",
        color: "warning",
        icon: "mdi-account-off",
        daysSinceLogin,
      };
    }
  }

  if (failedAttempts > 0) {
    return {
      status: "warning",
      label: "Active",
      color: "warning",
      icon: "mdi-alert",
      failedAttempts,
      attemptsRemaining: SETTINGS.MAX_LOGIN_ATTEMPTS - failedAttempts,
    };
  }

  return { status: "active", label: "Active", color: "success", icon: "mdi-check-circle", failedAttempts: 0 };
}

module.exports = {
  generateSessionToken,
  initializeUsersSheet,
  initializeActivityLogSheet,
  logActivity,
  checkSessionAndGetUser,
  isAccountLockedOut,
  updateFailedLoginAttempts,
  getAccountStatus,
};
