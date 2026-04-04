// Test CRC validation with a known valid static QRIS string
// Run: node tmp/test-crc.mjs

// Sample static QRIS from Bank Indonesia / GoPay / OVO (publicly known test vector)
// This is a real sample from QRIS spec documents
const SAMPLE_QRIS_STATIC = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140215RIFANIDAPRATAMA0303UMI51440014ID.CO.QRIS.WWW0215ID10230167579900303UMI5204541153033605802ID5912RIFANIDAPRATAMA6015KOTA ADMINISTRASI61051072062070503***6304B70B";

/** CRC16/CCITT-FALSE */
function calculateCRC16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** TLV walk to find CRC tag "63" position */
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

/** Current (BUGGY) normalizer */
function normalizeQrisBuggy(rawString) {
  const sanitized = rawString
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, "")  // ← BUG: removes spaces from merchant names etc.
    .trim();
  const crcIdx = sanitized.lastIndexOf("6304");
  if (crcIdx === -1) return sanitized;
  const end = crcIdx + 8;
  return sanitized.length >= end ? sanitized.slice(0, end) : sanitized;
}

/** Fixed normalizer */
function normalizeQrisFixed(rawString) {
  // Only strip real control chars and line endings, NOT printable spaces
  const sanitized = rawString
    .replace(/[^\x20-\x7E]/g, "")  // remove non-printable, keep space (0x20)
    .replace(/[\r\n\t]/g, "")       // remove only line endings & tabs
    .trim();
  const crcPos = findCrcTagPosition(sanitized);
  if (crcPos === -1) return sanitized;
  const end = crcPos + 8;
  return sanitized.length >= end ? sanitized.slice(0, end) : sanitized;
}

/** Validate using a given normalizer */
function validateWith(qrisString, normalizer, label) {
  const normalized = normalizer(qrisString);
  const crcPos = findCrcTagPosition(normalized);
  if (crcPos === -1 || crcPos + 8 > normalized.length) {
    console.log(`[${label}] ❌ CRC tag not found`);
    return;
  }
  const crcInString = normalized.slice(crcPos + 4, crcPos + 8).toUpperCase();
  const payloadForCrc = normalized.slice(0, crcPos + 4);
  const calculated = calculateCRC16(payloadForCrc);
  const valid = calculated === crcInString;
  
  console.log(`[${label}]`);
  console.log(`  Normalized  : ${normalized}`);
  console.log(`  CRC in QR   : ${crcInString}`);
  console.log(`  CRC calc    : ${calculated}`);
  console.log(`  Valid?      : ${valid ? "✅ YES" : "❌ NO"}`);
  
  if (!valid) {
    // Check if spaces are the culprit  
    const spacesInQris = (qrisString.match(/ /g) || []).length;
    console.log(`  ⚠️  Spaces in original: ${spacesInQris}`);
    console.log(`  ⚠️  Spaces after normalize: ${(normalized.match(/ /g) || []).length}`);
  }
}

console.log("=== QRIS CRC Debug Test ===\n");
console.log("Sample QRIS (with spaces in merchant name/city):");
console.log(SAMPLE_QRIS_STATIC);
console.log();

validateWith(SAMPLE_QRIS_STATIC, normalizeQrisBuggy, "BUGGY (removes all spaces)");
console.log();
validateWith(SAMPLE_QRIS_STATIC, normalizeQrisFixed, "FIXED (keeps spaces)");

// Also test: manually verify CRC of the sample
console.log("\n=== Manual CRC check ===");
const idx = SAMPLE_QRIS_STATIC.lastIndexOf("6304");
const payload = SAMPLE_QRIS_STATIC.slice(0, idx + 4);
const embeddedCRC = SAMPLE_QRIS_STATIC.slice(idx + 4, idx + 8);
const calculated = calculateCRC16(payload);
console.log(`Embedded CRC : ${embeddedCRC}`);
console.log(`Calculated   : ${calculated}`);
console.log(`Match?       : ${embeddedCRC === calculated ? "✅ YES" : "❌ NO"}`);
