// Deep investigation: step-by-step TLV walk + both normalizers
// Run: node tmp/test-crc2.mjs

/** CRC16/CCITT-FALSE */
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

/** Build a valid QRIS string from scratch for testing */
function tlv(tag, value) {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

function buildValidQRIS({ merchantName, merchantCity, amount } = {}) {
  let payload = "";
  payload += tlv("00", "01");                        // tag 00: format indicator
  payload += tlv("01", amount ? "12" : "11");         // tag 01: 11=static, 12=dynamic
  // Merchant account info (tag 26 — GPN example)
  let mai = "";
  mai += tlv("00", "ID.CO.QRIS.WWW");
  mai += tlv("01", "ID2026123456789");
  mai += tlv("02", "01");
  payload += tlv("26", mai);
  payload += tlv("52", "5411");                        // MCC
  payload += tlv("53", "360");                         // IDR
  if (amount) payload += tlv("54", String(amount));
  payload += tlv("58", "ID");
  payload += tlv("59", merchantName || "TOKO MAJU JAYA"); // spaces in name!
  payload += tlv("60", merchantCity || "KOTA JAKARTA");    // spaces in city!
  payload += tlv("61", "10110");
  payload += tlv("62", tlv("07", "***"));              // additional data
  // Calculate and append CRC
  const crcInput = payload + "6304";
  const crc = calculateCRC16(crcInput);
  payload += tlv("63", crc);
  return payload;
}

/** TLV walk to find CRC tag "63" position */
function findCrcTagPosition(data) {
  let pos = 0;
  while (pos + 4 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const lengthStr = data.substring(pos + 2, pos + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length)) {
      console.log(`  [TLV Walk] broke at pos=${pos}, tag="${tag}", length=NaN`);
      break;
    }
    console.log(`  [TLV Walk] pos=${pos}, tag="${tag}", len=${length}, value="${data.substring(pos+4, pos+4+length)}"`);
    if (tag === "63") return pos;
    pos += 4 + length;
  }
  return -1;
}

/** Buggy normalizer (current code) */
function normalizeBuggy(raw) {
  return raw
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, "") // ← removes ALL spaces!
    .trim();
}

/** Fixed normalizer */
function normalizeFixed(raw) {
  return raw
    .replace(/[^\x20-\x7E]/g, "")  // remove non-printable
    .replace(/[\r\n\t]/g, "")       // only remove line endings/tabs
    .trim();
}

function validateQRIS(qris, normFn, label) {
  console.log(`\n=== [${label}] ===`);
  const normalized = normFn(qris);
  console.log(`Normalized: "${normalized}"`);
  console.log(`Has spaces: ${(normalized.match(/ /g) || []).length}`);
  
  console.log("TLV Walk:");
  const crcPos = findCrcTagPosition(normalized);
  
  if (crcPos === -1) {
    console.log("RESULT: ❌ CRC tag not found");
    return;
  }
  
  const crcValue = normalized.slice(crcPos + 4, crcPos + 8).toUpperCase();
  const payloadForCrc = normalized.slice(0, crcPos + 4);
  const calculated = calculateCRC16(payloadForCrc);
  const valid = calculated === crcValue;
  
  console.log(`CRC in QR:    "${crcValue}"`);
  console.log(`CRC calc:     "${calculated}"`);
  console.log(`RESULT: ${valid ? "✅ VALID" : "❌ INVALID (mismatch)"}`);
}

// Build a valid QRIS with spaces in merchant name and city
const validQRIS = buildValidQRIS();
console.log("=== BUILT VALID QRIS ===");
console.log(`Raw: "${validQRIS}"`);
console.log(`Has spaces: ${(validQRIS.match(/ /g) || []).length} spaces`);

// Self-check: verify the generated QRIS is actually valid
const crcIdx = validQRIS.lastIndexOf("6304");
const embedded = validQRIS.slice(crcIdx + 4);
const payload = validQRIS.slice(0, crcIdx + 4);
const calc = calculateCRC16(payload);
console.log(`\nSelf-check: embedded CRC = "${embedded}", calc = "${calc}", match = ${embedded === calc}`);

console.log("\n--- Testing with BUGGY normalizer ---");
validateQRIS(validQRIS, normalizeBuggy, "BUGGY");

console.log("\n--- Testing with FIXED normalizer ---");
validateQRIS(validQRIS, normalizeFixed, "FIXED");

// Also test: what happens to merchant name length after removing spaces?
console.log("\n=== SPACE IMPACT ANALYSIS ===");
const name = "TOKO MAJU JAYA";
const city = "KOTA JAKARTA";
console.log(`Merchant name: "${name}" (len=${name.length})`);
console.log(`Merchant name no-space: "${name.replace(/\s/g,"")}" (len=${name.replace(/\s/g,"").length})`);
console.log(`City: "${city}" (len=${city.length})`);
console.log(`City no-space: "${city.replace(/\s/g,"")}" (len=${city.replace(/\s/g,"").length})`);
console.log("\n→ When spaces are stripped, the TLV 'length' field no longer matches actual value length → parser breaks!");
