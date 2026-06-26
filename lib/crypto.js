const crypto = require("crypto");

/**
 * Mirrors Code.gs's hashPassword(password, salt):
 *
 *   function hashPassword(password, salt) {
 *     if (!salt) salt = Utilities.getUuid();
 *     const saltedPassword = password + salt;
 *     const rawHash = Utilities.computeDigest(SHA_256, saltedPassword);
 *     const hash = rawHash.map(byte => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");
 *     return { hash, salt };
 *   }
 *
 * SHA-256 of the UTF-8 bytes of (password + salt) is identical whether
 * computed in Apps Script or Node, so existing rows in the Users sheet
 * (hash + salt columns) keep validating with zero migration needed.
 */
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomUUID();
  const saltedPassword = password + salt;
  const hash = crypto
    .createHash("sha256")
    .update(saltedPassword, "utf8")
    .digest("hex");
  return { hash, salt };
}

module.exports = { hashPassword };
