# QRISIN — Implementation Plan

## Overview

**QRISIN** adalah platform web full-stack yang memungkinkan UMKM mengkonversi QRIS statis mereka menjadi QRIS dinamis dengan nominal & pajak custom, beserta fitur manajemen transaksi lengkap.

**Tech Stack:**
- Frontend: Next.js 14 (App Router) + Tailwind CSS + Shadcn/UI
- Backend: Next.js API Routes (Route Handlers)
- Database: PostgreSQL + Prisma ORM
- Auth: NextAuth.js v5 (credentials + JWT)
- File Storage: Supabase Storage
- QR Processing: `qrcode` + `jsqr` + `sharp`
- Styling: Neobrutalism (Archivo Black + Space Mono)

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project**: Kamu perlu menyiapkan Supabase project sendiri. Setelah plan diapprove, saya akan generate file `.env.local` template yang perlu diisi dengan credentials kamu (DATABASE_URL, Supabase URL, Supabase keys).

> [!IMPORTANT]
> **PostgreSQL**: Prisma memerlukan koneksi PostgreSQL. Bisa menggunakan Supabase's built-in PostgreSQL atau database hosting lain (Railway, Neon.tech, etc.).

> [!WARNING]
> **QRIS Parsing (jsQR)**: Library `jsqr` bekerja di browser. Untuk server-side decoding, kita akan menggunakan `sharp` untuk image processing + decode manual. Alternatif: gunakan `zbar-wasm` atau `@zxing/library`. Saya akan implementasikan server-side QR decode menggunakan `sharp` + `jimp` sebagai fallback.

> [!CAUTION]
> **NextAuth v5 (Beta)**: API v5 berbeda signifikan dari v4. Konfigurasi akan menggunakan pendekatan terbaru dengan `auth.ts` + middleware.

---

## Proposed Changes

### Phase 1 — Project Foundation

#### [NEW] Project Setup
- `npx create-next-app@latest ./` di dalam `qris-dinamis-app/` dengan TypeScript + Tailwind + App Router
- Install semua dependency yang diperlukan
- Setup Prisma dengan schema lengkap
- Konfigurasi Tailwind dengan custom Neobrutalism tokens

#### [NEW] `tailwind.config.ts`
Custom theme dengan Neobrutalism color palette:
```
--bg-base: #FFFBF0 | --black: #0D0D0D | --accent-yellow: #FFE135
--accent-red: #FF3B3B | --accent-blue: #2563FF | --accent-green: #00C853
```
Plus custom box-shadow utilities dan font families.

#### [NEW] `prisma/schema.prisma`
Tiga model utama: `User`, `QrisStatic`, `Transaction` dengan enum `TransactionStatus` (PENDING, WAITING_PROOF, PAID, FAILED, EXPIRED).

---

### Phase 2 — Authentication & Layout

#### [NEW] `lib/auth.ts`
NextAuth v5 dengan Credentials Provider, bcrypt verification, JWT session (7 hari).

#### [NEW] `app/(auth)/sign-in/page.tsx`
Form login dengan Neobrutalism style. Background kuning + polka dot pattern. Card putih dengan border hitam tebal.

#### [NEW] `app/(auth)/sign-up/page.tsx`
Form registrasi (nama, email, password, konfirmasi). API route `POST /api/auth/register` untuk create user.

#### [NEW] `app/(dashboard)/layout.tsx`
Sidebar + Header layout. Sidebar jadi bottom nav di mobile.

---

### Phase 3 — UI Component Library (Neobrutalism)

#### [NEW] `components/ui/Button.tsx`
Variants: primary (bg-black/text-yellow), secondary (bg-yellow/text-black), danger (bg-red), ghost.
Hover: `translate(-2px, -2px)` + shadow lebih besar.
Active: `translate(2px, 2px)` + shadow lebih kecil.

#### [NEW] `components/ui/Card.tsx`
`border-[3px] border-black shadow-[4px_4px_0px_#0D0D0D]`
Hover variant: `-translate-x-1 -translate-y-1 shadow-[6px_6px_0px_#0D0D0D]`

#### [NEW] `components/ui/Input.tsx`
`border-[2px] border-black font-mono focus:ring-[3px] focus:ring-yellow-300`

#### [NEW] `components/ui/Badge.tsx`
Status badge untuk PENDING/PAID/FAILED/WAITING_PROOF dengan warna Neobrutalism.

#### [NEW] `components/ui/Modal.tsx`
Dialog berbasis Radix UI dengan override style Neobrutalism.

#### [NEW] `components/ui/Table.tsx`
Tabel dengan border hitam tebal dan striped rows.

---

### Phase 4 — Landing Page

#### [NEW] `app/page.tsx`
Landing page dengan navbar, hero section, features, how it works, footer.

#### [NEW] `components/landing/Navbar.tsx`
Sticky navbar dengan logo QRISIN + links + tombol Sign In/Sign Up.

#### [NEW] `components/landing/Hero.tsx`
Headline besar + CTA + mockup card QRIS dengan CSS keyframe animation + polka dot background.

#### [NEW] `components/landing/Features.tsx`
3 feature cards dengan hover effect Neobrutalism.

#### [NEW] `components/landing/HowItWorks.tsx`
4 step cards numbered dengan style bold.

---

### Phase 5 — Core QRIS Logic

#### [NEW] `lib/qris.ts`
EMVCo TLV parser & generator:
- `parseQRIS(rawString)` → extract tag 00, 01, 26-51, 52, 53, 54, 58, 59, 60, 63
- `generateDynamicQRIS({ qrisStatic, amount })` → rebuild QRIS string dengan tag 01="12" (dynamic) + tag 54=nominal + recalculate CRC16/CCITT-FALSE
- `calculateCRC16(data)` → implementasi CRC16 checksum

#### [NEW] `lib/supabase.ts`
Supabase client (public + service role) + helper functions untuk upload file ke bucket `qris-static` dan `payment-proofs`.

#### [NEW] `lib/prisma.ts`
Prisma client singleton.

#### [NEW] `lib/utils.ts`
Utility functions: `cn()`, currency formatter, date formatter.

---

### Phase 6 — API Routes

#### [NEW] `app/api/auth/register/route.ts`
`POST` — Register user baru, hash password bcrypt (salt 12), simpan ke DB.

#### [NEW] `app/api/auth/[...nextauth]/route.ts`
NextAuth handler.

#### [NEW] `app/api/qris/upload/route.ts`
`POST` — FormData upload QRIS image:
1. Upload ke Supabase Storage
2. Download image buffer → `sharp` processing
3. Server-side QR decode menggunakan `jimp` + manual pixel scanning
4. Parse EMVCo TLV string
5. Upsert `QrisStatic` di DB
Response: `{ success, data: QrisStatic }`

#### [NEW] `app/api/qris/generate/route.ts`
`POST` — Generate QRIS dinamis:
1. Fetch `QrisStatic` user dari DB
2. Kalkulasi pajak
3. `generateDynamicQRIS()` → QRIS string
4. Generate QR image PNG via `qrcode`
5. Upload QR image ke Supabase
6. Create `Transaction` di DB
Response: `{ transactionId, qrisString, qrisImageUrl, totalAmount }`

#### [NEW] `app/api/transaction/route.ts`
`GET` — List transaksi user (dengan filter + pagination).

#### [NEW] `app/api/transaction/[id]/route.ts`
`GET` — Detail transaksi.

#### [NEW] `app/api/transaction/[id]/proof/route.ts`
`POST` — Upload bukti transfer → Supabase → update DB field `proofImageUrl` + status `WAITING_PROOF`.

#### [NEW] `app/api/transaction/[id]/confirm/route.ts`
`POST` — Konfirmasi manual → update status `PAID`, set `confirmedAt` + `confirmedBy = "MANUAL"`.

---

### Phase 7 — Dashboard Pages

#### [NEW] `app/(dashboard)/dashboard/page.tsx`
Halaman utama dashboard:
- Section 1: Status QRIS Statis (upload zone atau merchant card)
- Section 2: Tombol "Buat QRIS Dinamis"

#### [NEW] `components/dashboard/QrisUploader.tsx`
Drag & drop zone dengan `react-dropzone`. Stripe pattern background. Preview image. Tombol "Proses QRIS".

#### [NEW] `components/dashboard/QrisDisplay.tsx`
Merchant card setelah QRIS diupload (nama, kota, NMID). Badge "QRIS AKTIF" hijau.

#### [NEW] `components/dashboard/CreateQrisModal.tsx`
Modal form: nominal (currency mask), deskripsi, toggle pajak (PPN/PPh/Custom), preview kalkulasi real-time.

#### [NEW] `components/dashboard/TaxCalculator.tsx`
Komponen kalkulasi pajak real-time dengan breakdown subtotal + pajak + total.

#### [NEW] `components/dashboard/QrisResult.tsx`
Tampil QR code besar + nominal + tombol download/copy/share + countdown 30 menit.

---

### Phase 8 — Transaction Pages

#### [NEW] `app/(dashboard)/history/page.tsx`
Tabel transaksi dengan filter status, search, filter tanggal, dan pagination Neobrutalism.

#### [NEW] `app/(dashboard)/transaction/[id]/page.tsx`
Detail transaksi: info, QR code, upload bukti, konfirmasi manual.

#### [NEW] `components/transaction/TransactionTable.tsx`
Tabel dengan badge status berwarna dan tombol aksi.

#### [NEW] `components/transaction/ConfirmModal.tsx`
Dialog konfirmasi tandai LUNAS.

#### [NEW] `components/transaction/ProofUploader.tsx`
Upload bukti transfer dengan drag & drop + preview.

---

### Phase 9 — Polish & Types

#### [NEW] `types/index.ts`
TypeScript types untuk semua entity (User, QrisStatic, Transaction, dll).

#### [NEW] `middleware.ts`
Auth middleware untuk proteksi routes dashboard.

---

## Open Questions

> [!IMPORTANT]
> **Server-side QR Decode**: `jsqr` adalah library browser-only. Untuk server-side, kita perlu alternatif. Saya plan menggunakan kombinasi `sharp` (image processing) + manual pixel extraction → `jsqr` berjalan di Node.js environment sebenarnya bisa, hanya perlu feed raw image data yang benar. Apakah kamu setuju dengan pendekatan ini, atau prefer library lain?

> [!IMPORTANT]
> **Supabase Buckets**: Apakah kamu sudah memiliki Supabase project? Jika ya, apakah perlu saya sertakan script setup bucket otomatis atau kamu akan setup manual?

> [!WARNING]
> **Environment Variables**: Setelah setup selesai, kamu perlu mengisi `.env.local` dengan credentials Supabase dan PostgreSQL. Apakah kamu sudah punya credentials ini, atau perlu saya bantu generate dengan data dummy untuk testing lokal?

---

## Verification Plan

### Build Verification
- `npm run build` — pastikan tidak ada TypeScript errors
- `npx prisma validate` — validasi schema Prisma

### Automated Tests
- Browser test: Landing page load + navigasi ke Sign Up
- Browser test: Register user baru + auto redirect ke dashboard
- Browser test: Upload QRIS statis + lihat merchant card
- Browser test: Generate QRIS dinamis + lihat QR code
- Browser test: History page + filter transaksi

### Manual Verification
- Test actual QRIS decode dengan file QRIS statis yang valid
- Test generate QRIS dinamis dan scan dengan aplikasi QRIS scanner
- Test upload bukti transfer + konfirmasi manual

---

## Build Order Summary

| Phase | Target | Status |
|-------|--------|--------|
| 1 | Project setup + Tailwind config + Prisma schema | ⬜ |
| 2 | Auth (NextAuth) + Sign In/Up pages | ⬜ |
| 3 | UI Component Library (Neobrutalism) | ⬜ |
| 4 | Landing Page | ⬜ |
| 5 | Core QRIS lib (`lib/qris.ts`, `lib/supabase.ts`) | ⬜ |
| 6 | API Routes (semua) | ⬜ |
| 7 | Dashboard pages + components | ⬜ |
| 8 | Transaction pages + components | ⬜ |
| 9 | Polish (loading states, toast, responsive, countdown) | ⬜ |
