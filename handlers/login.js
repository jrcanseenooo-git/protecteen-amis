const sheets = require("../lib/sheetsClient");
const { hashPassword } = require("../lib/crypto");
const {
  initializeUsersSheet,
  generateSessionToken,
  logActivity,
  isAccountLockedOut,
  updateFailedLoginAttempts,
} = require("../lib/auth");

async function login(data) {
  try {
    const usersSheet = await initializeUsersSheet();
    const range = await usersSheet.getDataRange();
    const userData = await range.getValues();

    for (let i = 1; i < userData.length; i++) {
      if (
        userData[i][0] &&
        userData[i][0].toString().toLowerCase() === data.email.toLowerCase()
      ) {
        if (await isAccountLockedOut(userData[i], i + 1, usersSheet)) {
          const lockoutUntil = new Date(userData[i][9]);
          const minutesRemaining = Math.ceil((lockoutUntil - new Date()) / 60000);
          return JSON.stringify({
            success: false,
            message: `Account locked. Try again in ${minutesRemaining} minutes.`,
          });
        }

        const userStatus = userData[i][11] || "active";
        if (userStatus === "deactivated") {
          return JSON.stringify({
            success: false,
            message: "Your account has been deactivated. Please contact your administrator.",
          });
        }

        const storedHash = userData[i][1];
        const salt = userData[i][2];
        const passwordData = hashPassword(data.password, salt);

        if (passwordData.hash === storedHash) {
          await usersSheet.getRange(i + 1, 8).setValue(new Date().toISOString());
          await updateFailedLoginAttempts(usersSheet, i + 1, true);

          const userRegion = userData[i][5];
          let userProvince = "";

          if (userRegion && !userRegion.toString().toUpperCase().includes("ALL Region")) {
            try {
              const ss = sheets.getActive();
              const exists = await ss.sheetExists("LocationDB");
              if (exists) {
                const locationSheet = ss.getSheetByName("LocationDB");
                const locRange = await locationSheet.getDataRange();
                const locationData = await locRange.getValues();
                for (let r = 1; r < locationData.length; r++) {
                  if (
                    (locationData[r][0] || "").toString().trim().toUpperCase() ===
                    userRegion.toString().trim().toUpperCase()
                  ) {
                    userProvince = locationData[r][1] || "";
                    break;
                  }
                }
              }
            } catch (e) {
              // same silent swallow as the original
            }
          }

          const user = {
            email: userData[i][0],
            name: userData[i][3],
            role: userData[i][4],
            region: userRegion,
            province: userProvince,
            mustChangePassword: userData[i][10] === true || userData[i][10] === "TRUE",
            status: userStatus,
          };

          const sessionToken = generateSessionToken();
          const loginTimestamp = Date.now();

          await logActivity(
            "USER_LOGIN",
            { email: user.email, loginTime: new Date(loginTimestamp).toLocaleString() },
            user,
          );

          return JSON.stringify({
            success: true,
            message: "Login successful",
            user,
            sessionToken,
            loginTimestamp,
          });
        } else {
          await updateFailedLoginAttempts(usersSheet, i + 1);
          await logActivity("LOGIN_FAILED", { email: data.email, reason: "Invalid password" });
          return JSON.stringify({ success: false, message: "Invalid password" });
        }
      }
    }

    await logActivity("LOGIN_FAILED", { email: data.email, reason: "Email not found" });
    return JSON.stringify({ success: false, message: "Email not found" });
  } catch (error) {
    return JSON.stringify({ success: false, message: "Error: " + error.toString() });
  }
}

module.exports = login;
