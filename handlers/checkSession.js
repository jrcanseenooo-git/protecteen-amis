const { checkSessionAndGetUser, logActivity } = require("../lib/auth");

async function checkSession(clientData) {
  try {
    if (!clientData) {
      return JSON.stringify({ success: false, message: "No session data provided", silent: true });
    }

    if (typeof clientData === "string") {
      try {
        clientData = JSON.parse(clientData);
      } catch (e) {
        return JSON.stringify({ success: false, message: "Invalid session format", silent: true });
      }
    }

    if (
      process.env.FORCE_LOCAL_BACKEND === "1" &&
      clientData.user &&
      clientData.user.email
    ) {
      return JSON.stringify({
        success: true,
        user: clientData.user,
        sessionToken: clientData.sessionToken || "local-dev-session",
      });
    }

    if (!clientData.sessionToken || !clientData.user || !clientData.loginTimestamp) {
      return JSON.stringify({ success: false, message: "Incomplete session data", silent: true });
    }

    const result = await checkSessionAndGetUser(clientData);

    if (result.success) {
      return JSON.stringify({ success: true, user: result.user, sessionToken: clientData.sessionToken });
    }
    return JSON.stringify({ success: false, message: result.message, silent: true });
  } catch (error) {
    return JSON.stringify({ success: false, message: "Session error: " + error.toString(), silent: true });
  }
}

async function logoutSession(clientData) {
  try {
    if (clientData && clientData.user) {
      await logActivity("USER_LOGOUT", { email: clientData.user.email }, clientData.user);
    }
    return JSON.stringify({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return JSON.stringify({ success: false, message: "Error: " + error.toString() });
  }
}

module.exports = { checkSession, logoutSession };
