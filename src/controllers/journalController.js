const { checkSessionAndGetUser, logActivity } = require("../services/auth");
const { safeErrorResponse } = require("../services/errorResponse");
const {
  getJournalWorkerNotes: fetchRecords,
  saveJournalWorkerNotes: persistRecord,
} = require("../models/journalModel");

async function getJournalWorkerNotes(month, regionFilter, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);

    const records = await fetchRecords(month, regionFilter || null);
    return JSON.stringify({ success: true, records });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("getJournalWorkerNotes failed", error, { records: [] }));
  }
}

async function saveJournalWorkerNotes(data, clientData) {
  try {
    const sessionCheck = await checkSessionAndGetUser(clientData);
    if (!sessionCheck.success) return JSON.stringify(sessionCheck);
    const currentUser = sessionCheck.user;

    if (!data || !data.idNumber) {
      return JSON.stringify({ success: false, message: "Beneficiary is required." });
    }

    await persistRecord(data, currentUser.email);
    await logActivity("JOURNAL_WORKER_NOTES_SAVED", { idNumber: data.idNumber, month: data.month }, currentUser);

    return JSON.stringify({ success: true, message: "Journal and worker notes saved." });
  } catch (error) {
    return JSON.stringify(safeErrorResponse("saveJournalWorkerNotes failed", error));
  }
}

module.exports = { getJournalWorkerNotes, saveJournalWorkerNotes };
