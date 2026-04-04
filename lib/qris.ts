/**
 * lib/qris.ts — EMVCo TLV QRIS Parser & Generator
 *
 * Implements EMVCo Merchant-Presented QR Code Specification
 * for the National Standard QRIS Indonesia (Bank Indonesia)
 */

/** CRC16/CCITT-FALSE checksum */
export function calculateCRC16(data: string): string {
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

/** TLV entry */
export interface TLVEntry {
  tag: string;
  length: string;
  value: string;
}

/** Parsed QRIS data */
export interface ParsedQRIS {
  raw: string;
  payloadFormatIndicator?: string;       // Tag 00
  pointOfInitiation?: string;             // Tag 01 (11=static, 12=dynamic)
  merchantAccountInfos: TLVEntry[];       // Tag 26–51
  merchantCategoryCode?: string;          // Tag 52
  transactionCurrency?: string;           // Tag 53
  transactionAmount?: string;             // Tag 54
  countryCode?: string;                   // Tag 58
  merchantName?: string;                  // Tag 59
  merchantCity?: string;                  // Tag 60
  postalCode?: string;                    // Tag 61
  nmid?: string;
  crc?: string;                           // Tag 63
}

/**
 * Normalize decoded QRIS payload by removing hidden control chars only.
 *
 * IMPORTANT: Do NOT strip ASCII spaces (0x20) — QRIS TLV fields can contain
 * spaces in values (e.g. merchant name "TOKO MAJU JAYA", city "KOTA JAKARTA").
 * Stripping spaces corrupts the TLV length→value alignment and breaks CRC checks.
 */
export function normalizeQrisPayload(rawString: string): string {
  const sanitized = rawString
    .replace(/[^\x20-\x7E]/g, "") // remove non-printable chars, keep space (0x20)
    .replace(/[\r\n\t]/g, "")     // remove only CR / LF / Tab (NOT regular spaces)
    .trim();

  // Use TLV-aware walk to find the real CRC tag (tag "63") position
  // instead of fragile lastIndexOf("6304") which can match mid-payload substrings
  const crcPos = findCrcTagPosition(sanitized);
  if (crcPos === -1) {
    return sanitized;
  }

  const crcEndIndex = crcPos + 8; // "63" + "04" + 4-char CRC value
  if (sanitized.length >= crcEndIndex) {
    return sanitized.slice(0, crcEndIndex);
  }

  return sanitized;
}

/**
 * Walk TLV fields to find the byte-offset of the CRC tag "63".
 * Returns -1 if not found.
 */
function findCrcTagPosition(data: string): number {
  let pos = 0;
  while (pos + 4 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const lengthStr = data.substring(pos + 2, pos + 4);
    const length = parseInt(lengthStr, 10);

    if (isNaN(length)) break;

    if (tag === "63") {
      return pos;
    }

    pos += 4 + length;
  }
  return -1;
}

/** Parse an EMVCo TLV QRIS string */
export function parseQRIS(rawString: string): ParsedQRIS {
  const result: ParsedQRIS = {
    raw: rawString,
    merchantAccountInfos: [],
  };

  let pos = 0;
  const data = normalizeQrisPayload(rawString);

  while (pos < data.length - 4) {
    const tag = data.substring(pos, pos + 2);
    pos += 2;

    if (pos + 2 > data.length) break;
    const lengthStr = data.substring(pos, pos + 2);
    const length = parseInt(lengthStr, 10);
    pos += 2;

    if (isNaN(length) || pos + length > data.length) break;
    const value = data.substring(pos, pos + length);
    pos += length;

    switch (tag) {
      case "00":
        result.payloadFormatIndicator = value;
        break;
      case "01":
        result.pointOfInitiation = value;
        break;
      case "52":
        result.merchantCategoryCode = value;
        break;
      case "53":
        result.transactionCurrency = value;
        break;
      case "54":
        result.transactionAmount = value;
        break;
      case "58":
        result.countryCode = value;
        break;
      case "59":
        result.merchantName = value;
        break;
      case "60":
        result.merchantCity = value;
        break;
      case "61":
        result.postalCode = value;
        break;
      case "63":
        result.crc = value;
        break;
      default: {
        const tagNum = parseInt(tag, 10);
        if (tagNum >= 26 && tagNum <= 51) {
          result.merchantAccountInfos.push({
            tag,
            length: lengthStr,
            value,
          });
          // Extract NMID from sub-tags (tag 26, sub-tag 01 typically has NMID)
          if (tag === "26" || tag === "51") {
            const nmid = extractSubTag(value, "01");
            if (nmid && !result.nmid) {
              result.nmid = nmid;
            }
          }
        }
      }
    }
  }

  return result;
}

/** Extract value from a TLV sub-string by tag */
function extractSubTag(data: string, targetTag: string): string | null {
  let pos = 0;
  while (pos < data.length - 4) {
    const tag = data.substring(pos, pos + 2);
    pos += 2;
    const lengthStr = data.substring(pos, pos + 2);
    const length = parseInt(lengthStr, 10);
    pos += 2;
    if (isNaN(length) || pos + length > data.length) break;
    const value = data.substring(pos, pos + length);
    pos += length;
    if (tag === targetTag) return value;
  }
  return null;
}

/** Build a TLV field string */
function tlv(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${tag}${length}${value}`;
}

interface GenerateOptions {
  parsedQris: ParsedQRIS;
  amount: number;
  description?: string;
}

/**
 * Generate a dynamic QRIS string from a static QRIS
 * Sets tag 01 to "12" (dynamic) and adds tag 54 (amount)
 */
export function generateDynamicQRIS({
  parsedQris,
  amount,
}: GenerateOptions): string {
  let payload = "";

  // Tag 00 — Payload Format Indicator
  payload += tlv("00", parsedQris.payloadFormatIndicator || "01");

  // Tag 01 — Point of Initiation (12 = dynamic)
  payload += tlv("01", "12");

  // Tags 26–51 — Merchant Account Information (preserve as-is)
  for (const info of parsedQris.merchantAccountInfos) {
    payload += `${info.tag}${info.length}${info.value}`;
  }

  // Tag 52 — Merchant Category Code
  if (parsedQris.merchantCategoryCode) {
    payload += tlv("52", parsedQris.merchantCategoryCode);
  }

  // Tag 53 — Transaction Currency (360 = IDR)
  payload += tlv("53", parsedQris.transactionCurrency || "360");

  // Tag 54 — Transaction Amount
  payload += tlv("54", amount.toString());

  // Tag 58 — Country Code
  payload += tlv("58", parsedQris.countryCode || "ID");

  // Tag 59 — Merchant Name
  if (parsedQris.merchantName) {
    payload += tlv("59", parsedQris.merchantName);
  }

  // Tag 60 — Merchant City
  if (parsedQris.merchantCity) {
    payload += tlv("60", parsedQris.merchantCity);
  }

  // Tag 61 — Postal Code (if present)
  if (parsedQris.postalCode) {
    payload += tlv("61", parsedQris.postalCode);
  }

  // Tag 63 — CRC (always last; calculate on payload + "6304")
  const crcInput = payload + "6304";
  const crc = calculateCRC16(crcInput);
  payload += tlv("63", crc);

  return payload;
}

/** Validate a QRIS string's CRC */
export function validateQRIS(qrisString: string): boolean {
  const normalized = normalizeQrisPayload(qrisString);
  if (normalized.length < 8) return false;

  // Use TLV-aware walk (same as normalizeQrisPayload) to find CRC tag "63"
  const crcTagIndex = findCrcTagPosition(normalized);
  if (crcTagIndex === -1 || crcTagIndex + 8 > normalized.length) {
    return false;
  }

  const crcInString = normalized
    .slice(crcTagIndex + 4, crcTagIndex + 8)
    .toUpperCase();

  if (!/^[0-9A-F]{4}$/.test(crcInString)) {
    return false;
  }

  const payloadForCrc = normalized.slice(0, crcTagIndex + 4);
  const calculated = calculateCRC16(payloadForCrc);
  return calculated === crcInString;
}

/** Check if a QRIS string is dynamic (tag 01 = "12") */
export function isDynamicQRIS(qrisString: string): boolean {
  const parsed = parseQRIS(qrisString);
  return parsed.pointOfInitiation === "12";
}
