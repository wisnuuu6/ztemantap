# Tim BTS App

## Modulo 1: Auth & User Management

### Stack backend yang dipilih
- Node.js + Fastify
- SQLite via better-sqlite3
- Cookie-based auth dengan sesi server-side

### Metode hash password
Password di-hash dengan `crypto.scryptSync` dan salt acak per-user. Format yang disimpan:

`scrypt:<saltHex>:<hashHex>`

### Rate limit login
Endpoint `/login` dibatasi 5 request per menit per IP melalui `@fastify/rate-limit` dan 5 request per menit per username.

### Cookie aman
Session cookie dikirim dengan flag:
- `httpOnly: true`
- `sameSite: 'lax'`
- `secure: true` di production
- `path: '/'`

### Validasi upload
Fungsi validasi upload tersedia untuk integrasi ke modul foto di masa depan. Validasi mencakup:
- tipe file yang diizinkan (`image/jpeg`, `image/png`, `image/webp`)
- ukuran maksimum file
- kompresi foto dilakukan di sisi klien sebelum upload

### Desain offline-ready
Semua data baru memakai `id` UUID dari klien untuk mencegah duplikasi saat antrean offline dikirim ulang.

### Volume data
Direktori `data/` disimpan di `.gitignore` dan dipasang ke volume Docker pada container app.

## Membuat admin pertama

Endpoint HTTP bootstrap admin tidak tersedia. Admin pertama hanya dapat dibuat ketika tabel `users` kosong:

```bash
read -r -p "Username admin: " ADMIN_USERNAME
read -r -p "Nama admin: " ADMIN_NAME
read -r -s -p "Password admin: " ADMIN_PASSWORD
echo
export ADMIN_USERNAME ADMIN_NAME ADMIN_PASSWORD
npm run create-admin
unset ADMIN_USERNAME ADMIN_NAME ADMIN_PASSWORD
```

Username dan nama diminta dari environment, dan password wajib disediakan dari environment untuk perintah CLI; tidak ada password bawaan.

## Reverse proxy dan cookie produksi

Saat `NODE_ENV=production`, cookie sesi selalu memakai `Secure`, `HttpOnly`, dan `SameSite=Lax`. Akses aplikasi melalui HTTPS.

Fastify hanya mempercayai alamat proxy yang ditentukan oleh `TRUST_PROXY`, bukan sembarang header `X-Forwarded-For`. Default untuk server non-Docker yang menerima koneksi dari reverse proxy lokal adalah `127.0.0.1,::1`. Untuk Docker Compose, `TRUST_PROXY` wajib diatur ke alamat sumber koneksi dari reverse proxy yang terlihat dari dalam container; gunakan alamat hop yang spesifik dan jangan mempercayai semua alamat (`*`). Dengan demikian `request.ip` memakai IP klien yang diteruskan oleh Tailscale Serve, bukan alamat proxy yang sama untuk semua anggota. Rate limit login membatasi 5 percobaan per menit per IP dan per username.
