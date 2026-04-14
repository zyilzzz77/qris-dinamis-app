This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

1. Copy `.env.example` menjadi `.env.local`.
2. Sesuaikan domain production:

```env
NEXT_PUBLIC_SITE_URL="https://bikinqris.app"
NEXTAUTH_URL="https://bikinqris.app"
```

3. Gunakan secret yang kuat, lalu isi nilai yang sama untuk `AUTH_SECRET` dan `NEXTAUTH_SECRET`.
4. Untuk local development, boleh override ke `http://localhost:3000`.
5. Saat deploy production, set semua env di dashboard hosting (jangan commit `.env.local`).

## Email Verification Setup

Fitur daftar akun sekarang wajib verifikasi kode OTP via email.

1. Isi env SMTP di `.env.local` (lihat `.env.example`):
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
	- `SMTP_USER`, `SMTP_PASS`
	- `SMTP_FROM`, `SMTP_FROM_NAME`
	- `SMTP_FROM_ALERT` untuk OTP verifikasi akun
	- `SMTP_FROM_NOTIFICATION` untuk notifikasi user (akun berhasil dibuat, lupa password, maintenance)
	- `SMTP_FROM_CUSTOMER_SERVICE` untuk pesan customer service
	- Jika provider membatasi sender harus milik akun login SMTP (contoh Spacemail), isi juga:
	  - `SMTP_USER_ALERT`, `SMTP_PASS_ALERT`
	  - `SMTP_USER_NOTIFICATION`, `SMTP_PASS_NOTIFICATION`
	  - `SMTP_USER_CUSTOMER_SERVICE`, `SMTP_PASS_CUSTOMER_SERVICE`
2. Isi secret email dengan nilai acak kuat:
	- `EMAIL_VERIFICATION_SECRET`
	- `PASSWORD_RESET_SECRET`
3. Jalankan update schema Prisma:

```bash
npx prisma db push
npx prisma generate
```

4. Jalankan aplikasi:

```bash
npm run dev
```

Alur user:
- Register akun di `/sign-up`
- Sistem kirim kode OTP 6 digit ke email
- User input kode di halaman sign-up
- Setelah valid, user otomatis login
- Jika lupa password, user bisa request reset di `/forgot-password`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
