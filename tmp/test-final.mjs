// Final validation test using the EXACT same logic as fixed qris.ts
// Run: node tmp/test-final.mjs

function calculateCRC16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function findCrcTagPosition(data) {
  let pos = 0;
  while (pos + 4 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const lengthStr = data.substring(pos + 2, pos + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length)) break;
    if (tag === "63") return pos;
    pos += 4 + length;
  }
  return -1;
}

// FIXED normalizeQrisPayload (matches updated lib/qris.ts)
function normalizeQrisPayload(rawString) {
  const sanitized = rawString
    .replace(/[^\x20-\x7E]/g, "") // remove non-printable chars, keep space (0x20)
    .replace(/[\r\n\t]/g, "")     // remove only CR / LF / Tab (NOT regular spaces)
    .trim();
  const crcPos = findCrcTagPosition(sanitized);
  if (crcPos === -1) return sanitized;
  const crcEndIndex = crcPos + 8;
  if (sanitized.length >= crcEndIndex) return sanitized.slice(0, crcEndIndex);
  return sanitized;
}

function validateQRIS(qrisString) {
  const normalized = normalizeQrisPayload(qrisString);
  if (normalized.length < 8) return false;
  const crcTagIndex = findCrcTagPosition(normalized);
  if (crcTagIndex === -1 || crcTagIndex + 8 > normalized.length) return false;
  const crcInString = normalized.slice(crcTagIndex + 4, crcTagIndex + 8).toUpperCase();
  if (!/^[0-9A-F]{4}$/.test(crcInString)) return false;
  const payloadForCrc = normalized.slice(0, crcTagIndex + 4);
  return calculateCRC16(payloadForCrc) === crcInString;
}

function tlv(tag, value) {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

// Build valid test QRIS strings with various space scenarios
function buildQRIS(merchantName, merchantCity, amount) {
  let p = tlv("00","01") + tlv("01", amount ? "12" : "11");
  let mai = tlv("00","ID.CO.QRIS.WWW") + tlv("01","ID2026123456789") + tlv("02","01");
  p += tlv("26", mai);
  p += tlv("52","5411") + tlv("53","360");
  if (amount) p += tlv("54", String(amount));
  p += tlv("58","ID") + tlv("59", merchantName) + tlv("60", merchantCity);
  p += tlv("62", tlv("07","***"));
  const crc = calculateCRC16(p + "6304");
  p += tlv("63", crc);
  return p;
}

const tests = [
  ["Simple name (no spaces)", buildQRIS("TOKOBAJU", "JAKARTA", null)],
  ["Name WITH spaces", buildQRIS("TOKO MAJU JAYA", "KOTA JAKARTA", null)],
  ["Dynamic WITH amount", buildQRIS("WARUNG MAKAN ENAK", "BANDUNG KOTA", 15000)],
  ["3 spaces in name+city", buildQRIS("PT SUMBER REJEKI ABADI", "KOTA ADMINISTRASI JAKARTA SELATAN", null)],
];

let allPassed = true;
for (const [label, qris] of tests) {
  const valid = validateQRIS(qris);
  if (!valid) allPassed = false;
  console.log(`${valid ? "✅" : "❌"} ${label}`);
  if (!valid) console.log(`   QR: ${qris}`);
}

console.log(`\n${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
