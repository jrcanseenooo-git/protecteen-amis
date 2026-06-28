const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

let _sheetsApiPromise = null;
let _spreadsheetMetaCache = null;
let _spreadsheetMetaCacheAt = 0;
const SPREADSHEET_META_TTL_MS = Number(process.env.SHEETS_META_CACHE_TTL_MS || 60000);
const SHEET_VALUES_CACHE_TTL_MS = Number(process.env.SHEETS_VALUES_CACHE_TTL_MS || 30000);
const _sheetValuesCache = new Map();
const _sheetValuesInflight = new Map();

function colToLetter(col) {
  // 1-indexed column number -> "A", "B", ... "AA", etc.
  let letter = "";
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

async function getSheetsApi() {
  if (_sheetsApiPromise) return _sheetsApiPromise;

  _sheetsApiPromise = (async () => {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    await auth.authorize();
    return google.sheets({ version: "v4", auth });
  })();

  return _sheetsApiPromise;
}

async function getSpreadsheetMeta(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    _spreadsheetMetaCache &&
    now - _spreadsheetMetaCacheAt < SPREADSHEET_META_TTL_MS
  ) {
    return _spreadsheetMetaCache;
  }

  const api = await getSheetsApi();
  const meta = await api.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  _spreadsheetMetaCache = meta;
  _spreadsheetMetaCacheAt = now;
  return meta;
}

function clearSpreadsheetMetaCache() {
  _spreadsheetMetaCache = null;
  _spreadsheetMetaCacheAt = 0;
}

function cloneValues(values) {
  return (values || []).map((row) => [...row]);
}

function clearSheetValuesCache(sheetName) {
  if (!sheetName) {
    _sheetValuesCache.clear();
    _sheetValuesInflight.clear();
    return;
  }
  _sheetValuesCache.delete(sheetName);
  _sheetValuesInflight.delete(sheetName);
}

/**
 * Range — mimics the handful of Range methods Code.gs actually uses:
 * getValues / setValues / getValue / setValue.
 */
class Range {
  constructor(sheetName, row, col, numRows, numCols) {
    this.sheetName = sheetName;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  _a1() {
    const startCol = colToLetter(this.col);
    const endCol = colToLetter(this.col + this.numCols - 1);
    const startRow = this.row;
    const endRow = this.row + this.numRows - 1;
    return `'${this.sheetName}'!${startCol}${startRow}:${endCol}${endRow}`;
  }

  async getValues() {
    const api = await getSheetsApi();
    const res = await api.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: this._a1(),
    });
    const values = res.data.values || [];
    // Pad to the requested shape, same guarantee Apps Script gives you.
    const padded = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = values[r] || [];
      const padRow = [];
      for (let c = 0; c < this.numCols; c++) {
        padRow.push(row[c] !== undefined ? row[c] : "");
      }
      padded.push(padRow);
    }
    return padded;
  }

  async getValue() {
    const values = await this.getValues();
    return values[0][0];
  }

  async setValues(values2D) {
    const api = await getSheetsApi();
    await api.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: this._a1(),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: values2D },
    });
    clearSheetValuesCache(this.sheetName);
  }

  async setValue(value) {
    await this.setValues([[value]]);
  }
}

/**
 * SheetRef — mimics the Sheet object returned by ss.getSheetByName().
 */
class SheetRef {
  constructor(sheetName) {
    this.sheetName = sheetName;
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    return new Range(this.sheetName, row, col, numRows, numCols);
  }

  async _allValues() {
    const now = Date.now();
    const cached = _sheetValuesCache.get(this.sheetName);
    if (cached && cached.expiresAt > now) {
      return cloneValues(cached.values);
    }

    if (_sheetValuesInflight.has(this.sheetName)) {
      return cloneValues(await _sheetValuesInflight.get(this.sheetName));
    }

    const api = await getSheetsApi();
    const request = api.spreadsheets.values
      .get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${this.sheetName}'`,
      })
      .then((res) => {
        const values = res.data.values || [];
        _sheetValuesCache.set(this.sheetName, {
          values: cloneValues(values),
          expiresAt: Date.now() + SHEET_VALUES_CACHE_TTL_MS,
        });
        return values;
      })
      .finally(() => {
        _sheetValuesInflight.delete(this.sheetName);
      });

    _sheetValuesInflight.set(this.sheetName, request);
    return cloneValues(await request);
  }

  async getDataRange() {
    const values = await this._allValues();
    const numRows = Math.max(values.length, 1);
    const numCols = values.reduce((max, row) => Math.max(max, row.length), 1);
    const range = new Range(this.sheetName, 1, 1, numRows, numCols);
    // Short-circuit so we don't re-fetch — stash the already-fetched values.
    range.getValues = async () => {
      const padded = [];
      for (let r = 0; r < numRows; r++) {
        const row = values[r] || [];
        const padRow = [];
        for (let c = 0; c < numCols; c++) {
          padRow.push(row[c] !== undefined ? row[c] : "");
        }
        padded.push(padRow);
      }
      return padded;
    };
    return range;
  }

  async getLastRow() {
    const values = await this._allValues();
    return Math.max(values.length, 1);
  }

  async getLastColumn() {
    const values = await this._allValues();
    return Math.max(values.reduce((max, row) => Math.max(max, row.length), 0), 1);
  }

  async appendRow(rowArray) {
    const api = await getSheetsApi();
    await api.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${this.sheetName}'!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowArray] },
    });
    clearSheetValuesCache(this.sheetName);
  }

  async deleteRow(rowNumber) {
    const api = await getSheetsApi();
    const meta = await getSpreadsheetMeta();
    const sheet = meta.data.sheets.find(
      (s) => s.properties.title === this.sheetName,
    );
    if (!sheet) throw new Error(`Sheet not found: ${this.sheetName}`);
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
    clearSheetValuesCache(this.sheetName);
  }

  async clearContents() {
    const api = await getSheetsApi();
    await api.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${this.sheetName}'`,
    });
    clearSheetValuesCache(this.sheetName);
  }

  async clear() {
    // Apps Script's sheet.clear() wipes values + formatting; values.clear()
    // only wipes values. Good enough here since nothing in this app reads
    // formatting back programmatically.
    await this.clearContents();
  }
}

/**
 * SpreadsheetRef — mimics SpreadsheetApp.getActive().
 */
class SpreadsheetRef {
  getSheetByName(name) {
    // Caller is responsible for checking existence the same way Code.gs
    // does (sheet APIs here don't throw on a missing sheet name until
    // you actually try to read/write it).
    return new SheetRef(name);
  }

  async insertSheet(name) {
    const api = await getSheetsApi();
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: name } } }],
      },
    });
    clearSpreadsheetMetaCache();
    clearSheetValuesCache(name);
    return new SheetRef(name);
  }

  async sheetExists(name) {
    const meta = await getSpreadsheetMeta();
    return meta.data.sheets.some((s) => s.properties.title === name);
  }
}

function getActive() {
  return new SpreadsheetRef();
}

module.exports = { getActive, SheetRef, Range, clearSpreadsheetMetaCache, clearSheetValuesCache };
