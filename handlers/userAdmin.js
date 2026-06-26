const sheets = require("../lib/sheetsClient");
const { hashPassword } = require("../lib/crypto");
const { SETTINGS } = require("../lib/settings");
const { formatDate } = require("../lib/helpers");
const {
  initializeUsersSheet,
  checkSessionAndGetUser,
  logActivity,
  getAccountStatus,
} = require("../lib/auth");

// toggleUserStatus — original Code.gs version takes no session check at
// all (an existing gap, not something this port introduced). Kept as-is.
async function toggleUserStatus(data) {
  try {
    const ss = sheets.getActive();
    const usersSheet = ss.getSheetByName(SETTINGS.SHEET_NAME.USERS);
    const range = await usersSheet.getDataRange();
    const userData = await range.getValues();

    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0] === data.email) {
        const newStatus = data.status;
        await usersSheet.getRange(i + 1, 12).setValue(newStatus);
        return JSON.stringify({
          success: true,
          message: `User ${newStatus === "active" ? "activated" : "deactivated"} successfully.`,
        });
      }
    }
    return JSON.stringify({ success: false, message: "User not found." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

async function getAllUsers(clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (currentUser.role !== SETTINGS.USER_ROLES.ADMIN) {
      await logActivity("UNAUTHORIZED_ACCESS", { action: "getAllUsers", user: currentUser.email }, currentUser);
      return JSON.stringify({ success: false, message: "Access denied. Admin only." });
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const data = await range.getValues();

    if (data.length < 2) {
      return JSON.stringify({ success: true, users: [] });
    }

    const users = [];
    for (let i = 1; i < data.length; i++) {
      const accountStatus = getAccountStatus(data[i]);
      users.push({
        email: data[i][0],
        name: data[i][3],
        role: data[i][4],
        region: data[i][5],
        created: formatDate(new Date(data[i][6]), "yyyy-MM-dd HH:mm"),
        lastLogin: data[i][7] ? formatDate(new Date(data[i][7]), "yyyy-MM-dd HH:mm") : "Never",
        failedAttempts: data[i][8] || 0,
        lockoutUntil: data[i][9] ? new Date(data[i][9]) : null,
        isLocked: !!(data[i][9] && new Date(data[i][9]) > new Date()),
        accountStatus,
        status: data[i][11] || "active",
      });
    }

    return JSON.stringify({ success: true, users });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

async function unlockAccount(email, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (currentUser.role !== SETTINGS.USER_ROLES.ADMIN) {
      return JSON.stringify({ success: false, message: "Access denied. Admin only." });
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const data = await range.getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
        await usersSheet.getRange(i + 1, 9).setValue(0);
        await usersSheet.getRange(i + 1, 10).setValue("");
        await logActivity("ACCOUNT_UNLOCKED", { email, unlockedBy: currentUser.email }, currentUser);
        return JSON.stringify({ success: true, message: "Account unlocked successfully" });
      }
    }
    return JSON.stringify({ success: false, message: "User not found" });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

async function autoUnlockExpiredAccounts() {
  try {
    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const data = await range.getValues();
    const now = new Date();
    let unlockedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const lockoutUntil = data[i][9] ? new Date(data[i][9]) : null;
      if (lockoutUntil && now >= lockoutUntil) {
        await usersSheet.getRange(i + 1, 9).setValue(0);
        await usersSheet.getRange(i + 1, 10).setValue("");
        unlockedCount++;
        await logActivity("AUTO_UNLOCK", { email: data[i][0], unlockedAt: now.toISOString() });
      }
    }

    return JSON.stringify({ success: true, unlockedCount });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

async function deleteUser(email, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (currentUser.role !== SETTINGS.USER_ROLES.ADMIN) {
      return JSON.stringify({ success: false, message: "Access denied. Admin only." });
    }
    if (currentUser.email.toLowerCase() === email.toLowerCase()) {
      return JSON.stringify({ success: false, message: "Cannot delete your own account" });
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const data = await range.getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
        await usersSheet.deleteRow(i + 1);
        await logActivity("USER_DELETED", { email, deletedBy: currentUser.email }, currentUser);
        return JSON.stringify({ success: true, message: "User deleted successfully" });
      }
    }
    return JSON.stringify({ success: false, message: "User not found" });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
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

async function updatePassword(email, newPassword, currentPassword, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    const isAdmin = currentUser.role === SETTINGS.USER_ROLES.ADMIN;
    const isOwnAccount = currentUser.email.toLowerCase() === email.toLowerCase();

    if (!isAdmin && !isOwnAccount) {
      return JSON.stringify({ success: false, message: "Access denied" });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return JSON.stringify({ success: false, message: passwordValidation.message });
    }

    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const data = await range.getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toLowerCase() === email.toLowerCase()) {
        if (isOwnAccount) {
          const storedHash = data[i][1];
          const salt = data[i][2];
          const currentPasswordData = hashPassword(currentPassword, salt);
          if (currentPasswordData.hash !== storedHash) {
            return JSON.stringify({ success: false, message: "Current password is incorrect" });
          }
        }

        const newPasswordData = hashPassword(newPassword);
        await usersSheet.getRange(i + 1, 2).setValue(newPasswordData.hash);
        await usersSheet.getRange(i + 1, 3).setValue(newPasswordData.salt);
        await usersSheet.getRange(i + 1, 11).setValue(false);

        await logActivity("PASSWORD_CHANGED", { email, changedBy: currentUser.email }, currentUser);
        return JSON.stringify({ success: true, message: "Password updated successfully" });
      }
    }
    return JSON.stringify({ success: false, message: "User not found" });
  } catch (error) {
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

module.exports = {
  toggleUserStatus,
  getAllUsers,
  unlockAccount,
  autoUnlockExpiredAccounts,
  deleteUser,
  updatePassword,
};
