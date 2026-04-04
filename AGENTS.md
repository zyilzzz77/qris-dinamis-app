<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:qris-library-rules -->
# QRIS Library — DO NOT MODIFY WITHOUT READING THIS FIRST

The files `lib/qris.ts` and `lib/qris-image.ts` implement the EMVCo TLV QRIS standard.
They are **bug-sensitive**. Past incorrect edits broke production for all users.
Follow these rules strictly before touching any code in these files.

## 🚫 FORBIDDEN changes

### 1. NEVER strip ASCII spaces from the QRIS payload string
```ts
// ❌ FORBIDDEN — this breaks TLV parsing and CRC validation
.replace(/\s+/g, "")

// ✅ CORRECT — only strip true control characters, NOT spaces
.replace(/[^\x20-\x7E]/g, "")  // keep space (0x20)
.replace(/[\r\n\t]/g, "")       // only remove CR/LF/Tab
```
**Why:** QRIS TLV fields encode their value length in the header (e.g. `5914TOKO MAJU JAYA` = tag 59, length 14, value with spaces). Removing spaces shrinks the value but leaves the length intact → subsequent TLV tags are parsed at wrong offsets → CRC tag never found → every valid QRIS rejects with "CRC tidak valid".

### 2. NEVER use `lastIndexOf("6304")` to find the CRC tag
```ts
// ❌ FORBIDDEN — "6304" can appear as a substring inside merchant account data
const crcTagIndex = str.lastIndexOf("6304");

// ✅ CORRECT — always use the TLV-walk function findCrcTagPosition()
const crcPos = findCrcTagPosition(str);
```
**Why:** The substring `"6304"` (tag 63 + length 04) can appear inside merchant account info values. `lastIndexOf` would find the wrong position, corrupt the payload slice, and produce a wrong CRC.

### 3. NEVER reorder or skip TLV fields in `generateDynamicQRIS`
The EMVCo spec requires tags in ascending numeric order: 00 → 01 → 26-51 → 52 → 53 → 54 → 58 → 59 → 60 → 61 → 62 → 63. Tag 63 (CRC) MUST always be last.

### 4. NEVER change the CRC algorithm
The algorithm is **CRC16/CCITT-FALSE** (init=0xFFFF, poly=0x1021). The input string MUST include `"6304"` (the CRC tag + length prefix) before the 4-char checksum placeholder. Changing the polynomial, init value, or input range will break all generated QRIS codes.

## ✅ What is safe to modify
- Error messages (strings passed to `jsonResponse`)
- Rate limit values in `route.ts`
- File size limits in `route.ts`
- Adding new supported MIME types to `SUPPORTED_IMAGE_MIME_TYPES`
- Logging / debugging statements (console.log, etc.)

## Key invariants (verified by tests in `tmp/`)
- `validateQRIS(generateDynamicQRIS(...))` must always return `true`
- `validateQRIS` must return `true` for any QRIS string with spaces in merchant name/city
- `findCrcTagPosition` must be used anywhere the CRC tag offset is needed
<!-- END:qris-library-rules -->
