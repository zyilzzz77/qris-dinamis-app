# VPS Email OTP Setup (Self-Hosted) — bikinqrisdinamis.app

Dokumen ini setup kirim OTP email full otomatis di VPS sendiri, tanpa layanan email berbayar.

Target:
- Domain app: `bikinqrisdinamis.app`
- Mail host: `mail.bikinqrisdinamis.app`
- Pengirim OTP verifikasi: `alert@bikinqrisdinamis.app`
- Pengirim notifikasi user: `notification@bikinqrisdinamis.app`
- Pengirim customer service: `customer-services@bikinqrisdinamis.app`
- App dan SMTP jalan di VPS yang sama (paling sederhana + gratis software)

## 0) Prasyarat Wajib

1. VPS Linux (rekomendasi Ubuntu 22.04/24.04) dengan IP publik statis.
2. Akses root (`sudo`).
3. Provider VPS membuka outbound port 25.
4. Domain `bikinqrisdinamis.app` bisa edit DNS.
5. Reverse DNS (PTR) bisa di-set dari panel provider VPS.

## 1) DNS Records (wajib sebelum test deliverability)

Ganti `SERVER_IP` dengan IP VPS kamu.

1. `A` record:
- Name: `@`
- Value: `SERVER_IP`
- Proxy/CDN: OFF (DNS only)

2. `A` record:
- Name: `mail`
- Value: `SERVER_IP`
- Proxy/CDN: OFF (DNS only)

3. `MX` record:
- Name: `@`
- Mail server: `mail.bikinqrisdinamis.app`
- Priority: `10`

4. `TXT` SPF:
- Name: `@`
- Value: `v=spf1 a:mail.bikinqrisdinamis.app mx -all`

5. `TXT` DMARC (awal aman):
- Name: `_dmarc`
- Value: `v=DMARC1; p=quarantine; adkim=s; aspf=s; rua=mailto:dmarc@bikinqrisdinamis.app`

6. PTR/rDNS (di panel provider VPS, bukan DNS biasa):
- `SERVER_IP -> mail.bikinqrisdinamis.app`

## 2) Set Hostname VPS

```bash
sudo hostnamectl set-hostname mail.bikinqrisdinamis.app
```

Edit `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Pastikan ada:

```text
127.0.0.1 localhost
SERVER_IP mail.bikinqrisdinamis.app mail
```

## 3) Install Paket SMTP + DKIM + DMARC

```bash
sudo apt update
sudo apt install -y postfix opendkim opendkim-tools opendmarc certbot mailutils
```

Saat installer Postfix tanya:
- General type: `Internet Site`
- System mail name: `mail.bikinqrisdinamis.app`

## 4) Buat TLS Certificate untuk Mail Host

Pastikan port 80 tidak dipakai dulu, lalu:

```bash
sudo certbot certonly --standalone -d mail.bikinqrisdinamis.app
```

Jika sukses, sertifikat ada di:
- `/etc/letsencrypt/live/mail.bikinqrisdinamis.app/fullchain.pem`
- `/etc/letsencrypt/live/mail.bikinqrisdinamis.app/privkey.pem`

## 5) Konfigurasi Postfix (Outbound SMTP)

Set parameter inti:

```bash
sudo postconf -e "myhostname = mail.bikinqrisdinamis.app"
sudo postconf -e "mydomain = bikinqrisdinamis.app"
sudo postconf -e "myorigin = \$mydomain"
sudo postconf -e "inet_interfaces = all"
sudo postconf -e "mydestination = \$myhostname, localhost.\$mydomain, localhost"
sudo postconf -e "mynetworks = 127.0.0.0/8 [::1]/128"
sudo postconf -e "relayhost ="

sudo postconf -e "smtpd_tls_cert_file = /etc/letsencrypt/live/mail.bikinqrisdinamis.app/fullchain.pem"
sudo postconf -e "smtpd_tls_key_file = /etc/letsencrypt/live/mail.bikinqrisdinamis.app/privkey.pem"
sudo postconf -e "smtpd_use_tls = yes"
sudo postconf -e "smtp_tls_security_level = may"
sudo postconf -e "smtpd_tls_security_level = may"

sudo postconf -e "smtpd_recipient_restrictions = permit_mynetworks,reject_unauth_destination"
```

## 6) Konfigurasi OpenDKIM

### 6.1 Buat key DKIM

```bash
sudo mkdir -p /etc/opendkim/keys/bikinqrisdinamis.app
cd /etc/opendkim/keys/bikinqrisdinamis.app
sudo opendkim-genkey -b 2048 -d bikinqrisdinamis.app -s mail -v
sudo chown opendkim:opendkim mail.private
```

### 6.2 File config OpenDKIM

`/etc/opendkim.conf` minimal:

```text
Syslog                  yes
UMask                   002
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1h
Background              yes
DNSTimeout              5
SignatureAlgorithm      rsa-sha256
UserID                  opendkim
Socket                  local:/run/opendkim/opendkim.sock
PidFile                 /run/opendkim/opendkim.pid
KeyTable                /etc/opendkim/key.table
SigningTable            refile:/etc/opendkim/signing.table
ExternalIgnoreList      /etc/opendkim/trusted.hosts
InternalHosts           /etc/opendkim/trusted.hosts
```

`/etc/opendkim/key.table`:

```text
mail._domainkey.bikinqrisdinamis.app bikinqrisdinamis.app:mail:/etc/opendkim/keys/bikinqrisdinamis.app/mail.private
```

`/etc/opendkim/signing.table`:

```text
*@bikinqrisdinamis.app mail._domainkey.bikinqrisdinamis.app
```

`/etc/opendkim/trusted.hosts`:

```text
127.0.0.1
localhost
bikinqrisdinamis.app
mail.bikinqrisdinamis.app
```

## 7) Konfigurasi OpenDMARC

`/etc/opendmarc.conf` minimal:

```text
AuthservID mail.bikinqrisdinamis.app
TrustedAuthservIDs mail.bikinqrisdinamis.app
Socket local:/run/opendmarc/opendmarc.sock
PidFile /run/opendmarc/opendmarc.pid
RejectFailures false
```

## 8) Hubungkan Milter ke Postfix

```bash
sudo postconf -e "milter_default_action = accept"
sudo postconf -e "milter_protocol = 6"
sudo postconf -e "smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock"
sudo postconf -e "non_smtpd_milters = local:/run/opendkim/opendkim.sock,local:/run/opendmarc/opendmarc.sock"
```

Restart service:

```bash
sudo systemctl restart opendkim
sudo systemctl restart opendmarc
sudo systemctl restart postfix
```

Enable saat boot:

```bash
sudo systemctl enable postfix opendkim opendmarc
```

## 9) Publish DKIM TXT di DNS

Ambil value DKIM:

```bash
sudo cat /etc/opendkim/keys/bikinqrisdinamis.app/mail.txt
```

Buat DNS TXT:
- Name: `mail._domainkey`
- Value: isi `p=...` dari file output

## 10) Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 25/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 11) Integrasi ke App Next.js (OTP kamu sudah siap)

Isi `.env.local` di app:

```env
EMAIL_VERIFICATION_SECRET="ISI_RANDOM_32+"
EMAIL_VERIFICATION_EXPIRES_MINUTES="10"
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS="60"
EMAIL_VERIFICATION_MAX_ATTEMPTS="5"

SMTP_HOST="127.0.0.1"
SMTP_PORT="25"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="notification@bikinqrisdinamis.app"
SMTP_FROM_NAME="bikinqrisdinamis"

SMTP_FROM_ALERT="alert@bikinqrisdinamis.app"
SMTP_FROM_ALERT_NAME="bikinqrisdinamis Alert"
SMTP_FROM_NOTIFICATION="notification@bikinqrisdinamis.app"
SMTP_FROM_NOTIFICATION_NAME="bikinqrisdinamis Notification"
SMTP_FROM_CUSTOMER_SERVICE="customer-services@bikinqrisdinamis.app"
SMTP_FROM_CUSTOMER_SERVICE_NAME="bikinqrisdinamis Customer Services"

PASSWORD_RESET_SECRET="ISI_RANDOM_32+"
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES="10"
```

Sync schema + build app:

```bash
cd /path/ke/qris-dinamis-app
npx prisma db push
npx prisma generate
npm run build
npm run start
```

## 12) Test Deliverability + Auth

1. Test SMTP local:

```bash
echo "test otp" | mail -s "SMTP Local Test" kamu@gmail.com
```

2. Lihat queue postfix:

```bash
mailq
```

3. Cek log realtime:

```bash
sudo tail -f /var/log/mail.log
```

4. Cek DNS dari server:

```bash
dig +short mx bikinqrisdinamis.app
dig +short txt bikinqrisdinamis.app
dig +short txt mail._domainkey.bikinqrisdinamis.app
dig +short txt _dmarc.bikinqrisdinamis.app
```

5. Cek health service:

```bash
sudo systemctl status postfix opendkim opendmarc
```

## 13) Hardening dan Anti-Spam

1. Jangan open relay (sudah dicegah via `reject_unauth_destination`).
2. Gunakan FROM domain sama dengan DKIM/SPF domain.
3. Warm-up pengiriman: mulai volume kecil dulu.
4. Pantau reputasi IP dan bounce.
5. Aktifkan fail2ban untuk postfix kalau traffic liar.

## 14) Troubleshoot Cepat

1. Email masuk spam:
- Cek SPF/DKIM/DMARC/PTR harus PASS.
- Kurangi volume kirim awal.

2. Mail tidak keluar:
- Cek port 25 outbound diblok provider.
- Cek `mailq` dan `/var/log/mail.log`.

3. TLS error:
- Pastikan cert valid untuk `mail.bikinqrisdinamis.app`.
- Pastikan path cert/key di postfix benar.

4. OTP endpoint jalan tapi email tidak terkirim:
- Cek env SMTP di app.
- Cek service postfix aktif.

---

Jika mau mode paling cepat, jalankan step 1-12 persis urut. Itu jalur paling stabil untuk domain ini.
