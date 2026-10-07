# PRD: Web App Manajemen Tim BTS ("Tim BTS App")

Versi 1.0 | Bahasa UI: Indonesia | Deploy: Docker di server sendiri (ejpi)

---

## 1. Latar Belakang

Tim BTS baru terbentuk, terdiri dari 4 orang: 1 leader, 1 engineer, 2 rigger. Tim mengerjakan proyek borongan (kontrak), saat ini **swap perangkat microwave ZTE untuk provider Indosat**. Saat ini belum ada sistem untuk mencatat persiapan tim, keuangan, dan progres site, sehingga rawan data tercecer, uang "nyangkut" di tagihan, dan persiapan yang terlewat.

## 2. Tujuan

1. Satu tempat untuk memantau **status semua site dan izinnya**.
2. Mencatat **pemasukan dan pengeluaran** tim per proyek, termasuk bukti nota.
3. Memastikan **persiapan tim, alat, dan kendaraan** tidak ada yang terlewat lewat checklist.
4. Bisa dipakai seluruh anggota tim dari HP, di lapangan, dengan input cepat.

**Bukan tujuan (v1):** akuntansi formal, payroll, integrasi sistem provider, aplikasi native Android/iOS.

## 3. Pengguna dan Peran

| Peran | Hak akses |
|---|---|
| Admin (Leader dan Engineer) | Semua fitur, kelola user, lihat semua data keuangan |
| Anggota (Rigger) | Lihat project/site, update status site, isi checklist, input laporan harian dan pengeluaran. **Tidak boleh melihat saldo, pemasukan, laba, maupun pembagian hasil** (keputusan tim). Rigger hanya melihat pengeluaran yang ia input sendiri |

## 4. Prinsip Produk

- **Mobile-first**, tombol besar, bisa satu tangan.
- **Input di bawah 30 detik** untuk aksi yang paling sering (catat pengeluaran, update status site, centang checklist).
- **Tahan sinyal jelek**: PWA, input disimpan lokal dan dikirim ulang saat online.
- **Sederhana**: form pendek, kolom catatan bebas untuk detail yang tidak baku.
- Semua istilah dalam Bahasa Indonesia yang biasa dipakai di lapangan.

---

## 5. Fitur

Prioritas: **P1** = wajib rilis awal, **P2** = setelah P1 dipakai tim, **P3** = opsional.

### 5.1 Project dan Site (P1)

- CRUD **Project**: nama (contoh: "Swap MW ZTE Indosat"), provider, nilai kontrak, tanggal mulai/target, status.
- CRUD **Site** di dalam project: ID site, nama site, lokasi (alamat + link Google Maps), tipe (tower/rooftop), catatan.
- **Status site** (alur): `Belum mulai → Survey → Menunggu izin → Siap eksekusi → Eksekusi → Selesai → Dokumen/BAST → Ditagih → Dibayar`.
- **Izin per site**, dua jenis: **Izin TP** dan **Izin Provider**. Masing-masing punya status (belum diajukan / diajukan / disetujui / ditolak), tanggal, dan catatan.
- **Data teknis swap** (ringkas, semua opsional): perangkat lama, perangkat baru, serial number, ukuran dish, nama link, hasil alignment (RSL), catatan bebas.
- **Foto per site**: sebelum, sesudah, dan lainnya (upload dari kamera HP).
- Daftar site bisa difilter berdasarkan status dan dicari berdasarkan ID/nama.
- Riwayat perubahan status (siapa, kapan).

### 5.2 Keuangan (P1)

- **Pemasukan**: tanggal, project, jumlah, jenis (DP / termin / pelunasan / lainnya), catatan.
- **Pengeluaran**: tanggal, project (boleh "umum"), kategori, jumlah, catatan, **foto nota**, dicatat oleh siapa.
- Kategori awal (bisa diubah admin): BBM, Tol/Parkir, Makan, Penginapan, Material, Sewa/Beli Alat, Upah, Servis Kendaraan, Lainnya.
- **Tombol cepat "+ Pengeluaran"** di semua halaman utama.
- **Ringkasan**: saldo kas total, pemasukan, pengeluaran, laba per project, pengeluaran per kategori (filter bulan/project).
- Pengeluaran yang diinput Anggota **langsung dihitung**, tanpa persetujuan Admin (keputusan tim). Admin tetap bisa mengedit/menghapus dan melihat siapa yang menginput.
- Export CSV/Excel.

### 5.3 Tim, Checklist, Alat, Kendaraan

**Checklist (P1)** (diminta khusus karena tim baru)
- Template checklist yang bisa dibuat/diedit admin, lalu dipakai berulang sebagai **instance** (contoh: "Persiapan berangkat site X", tanggal tertentu).
- Item punya status centang, siapa yang mencentang, dan waktu.
- Instance bisa dikaitkan ke site tertentu atau berdiri sendiri (untuk persiapan umum tim).
- Progres tampil sebagai persentase.
- Template awal disediakan (lihat Lampiran A), semua bisa diubah.

**Tim (P1)**
- Daftar anggota: nama, peran, nomor HP, kontak darurat. Login per anggota.

**Alat/Tools (P2)**
- Daftar alat: nama, jumlah, kondisi (baik / perlu perbaikan / rusak), lokasi (gudang / di mobil / di site), dipegang oleh siapa, catatan.
- Pada tahap awal cukup per jenis alat, belum per unit.

**Kendaraan (P2)**
- Data mobil: nama, plat, tanggal pajak/STNK, jadwal servis berikutnya, catatan.
- Log pemakaian ringan: tanggal, tujuan, KM awal/akhir (opsional). Biaya BBM/tol tetap dicatat di Keuangan.

### 5.4 Laporan Harian (P2)

- Satu entri per hari per project: site yang dikerjakan, ringkasan pekerjaan, kendala, foto, siapa yang hadir.
- Export laporan ke PDF (untuk dikirim ke provider bila perlu).

### 5.5 Tagihan (P2)

- Daftar site berstatus **Selesai/BAST tetapi belum Ditagih** dan **Ditagih tetapi belum Dibayar**, dengan jumlah hari tertunda.
- Nilai per site (opsional) untuk menghitung estimasi nilai tagihan yang masih tertahan.

### 5.6 Dashboard (P1)

Empat angka utama di halaman depan:
1. Site selesai / total
2. Uang masuk
3. Uang keluar
4. Tagihan belum cair

Plus: daftar "perlu perhatian" (izin menunggu terlalu lama, checklist belum lengkap, pajak/servis mobil mendekat).

### 5.7 Pembagian Hasil (P3)

- **Pembagian hasil berbeda per peran** (keputusan tim). Admin mengatur bagian tiap anggota per project, sebagai persentase atau nominal tetap. Angka bagian belum ditentukan, jadi **harus dapat dikonfigurasi** dan tidak di-hardcode.
- Halaman ini hanya bisa dilihat Admin.
- Perhitungan: laba bersih project dikurangi cadangan kas (opsional), dibagi sesuai skema.

### 5.8 Notifikasi dan Kalender (P3)

- Pengingat (pajak mobil, servis, izin, alat belum kembali) **hanya tampil di dashboard**. Tidak ada notifikasi Telegram/WhatsApp/push (keputusan tim).
- Kalender jadwal kerja tim per site.

---

## 6. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
|---|---|
| Perangkat | Utamanya HP (layar kecil), tetap nyaman di laptop |
| PWA | Bisa di-install ke layar utama, caching aset, antrean input offline untuk pengeluaran, centang checklist, dan update status |
| Performa | Ringan; server hanya ±3 GB RAM dan 2 core, jadi runtime hemat memori |
| Keamanan | Login wajib, password di-hash, sesi aman, validasi upload (tipe dan ukuran file), tidak ada halaman publik |
| Data | Backup otomatis harian, bisa dipulihkan dengan satu perintah |
| Foto | Dikompres di sisi klien sebelum upload (maks ±1600 px, kualitas ±0,8) untuk hemat bandwidth dan disk |
| Bahasa | Semua teks UI Bahasa Indonesia; format uang Rupiah (Rp 1.250.000); zona waktu Asia/Jakarta |

---

## 7. Arsitektur dan Deployment

Server: laptop lama "ejpi" (Ubuntu, Docker + Docker Compose, Tailscale, Portainer sudah ada). Port 80/443 sudah terpakai (CasaOS), port 8000, 9443, 20128 juga terpakai.

**Stack yang disarankan (ringan, satu container):**
- Backend: Node.js (Fastify atau Express) dengan API REST
- Database: **SQLite** (satu file, mode WAL), tanpa container database terpisah
- Frontend: React + Vite (atau Svelte) sebagai PWA, disajikan oleh container yang sama
- Auth: sesi berbasis cookie
- Upload foto: disimpan di volume Docker (`/data/uploads`)
- Satu `Dockerfile` multi-stage + satu `docker-compose.yml`

**Docker Compose (gambaran):**
- Service `tim-bts-app`, port host **8088** → container 3000
- Volume `./data:/data` (berisi `app.db` dan `uploads/`)
- `restart: unless-stopped`
- Environment: `SESSION_SECRET`, `TZ=Asia/Jakarta`
- Batas memori wajar (misal 512 MB)

**Akses tim:**
- **Dipilih: Tailscale.** Tiap anggota install Tailscale di HP dan akses lewat alamat Tailscale ejpi. Tidak membuka port ke internet. HTTPS lewat `tailscale serve`.
- Cadangan bila Tailscale merepotkan anggota: Cloudflare Tunnel (perlu domain), login tetap wajib.
- Catatan: PWA dan kamera HP umumnya butuh HTTPS. Siapkan HTTPS lewat Tailscale Serve (`tailscale serve`) atau Cloudflare Tunnel.

**Backup:**
- Cron harian: salin `app.db` (pakai perintah backup SQLite yang aman) dan folder `uploads` ke folder backup terpisah (misal share Samba atau disk lain), simpan 14 hari terakhir.
- Sertakan skrip restore.

Catatan: server terhubung via WiFi dan RAM terbatas; hindari proses build berat berulang di server (build image sekali, atau build di laptop lain lalu push).

---

## 8. Model Data (ringkas)

- `users` (id, nama, username, password_hash, peran, hp, kontak_darurat, aktif)
- `projects` (id, nama, provider, nilai_kontrak, tgl_mulai, tgl_target, status, catatan)
- `sites` (id, project_id, kode_site, nama, alamat, maps_url, tipe, status, nilai_site, catatan, data_swap JSON)
- `site_status_log` (id, site_id, status_lama, status_baru, user_id, waktu)
- `permits` (id, site_id, jenis [TP/PROVIDER], status, tgl_ajukan, tgl_disetujui, catatan)
- `site_photos` (id, site_id, jenis, file_path, user_id, waktu)
- `income` (id, project_id, tanggal, jumlah, jenis, catatan, user_id)
- `expenses` (id, project_id nullable, tanggal, kategori_id, jumlah, catatan, foto_path, user_id, status_konfirmasi)
- `expense_categories` (id, nama)
- `checklist_templates` (id, nama, deskripsi) dan `checklist_template_items` (id, template_id, teks, urutan)
- `checklists` (id, template_id nullable, nama, site_id nullable, tanggal) dan `checklist_items` (id, checklist_id, teks, selesai, selesai_oleh, selesai_pada)
- `tools` (id, nama, jumlah, kondisi, lokasi, dipegang_oleh, catatan)
- `vehicles` (id, nama, plat, tgl_pajak, tgl_servis_berikut, catatan) dan `vehicle_logs` (id, vehicle_id, tanggal, tujuan, km_awal, km_akhir, user_id)
- `daily_reports` (id, project_id, tanggal, ringkasan, kendala, hadir JSON, user_id) dan foto terkait
- `profit_shares` (id, project_id, user_id, tipe [persen/nominal], nilai)
- `settings` (key, value)

Semua tabel punya `created_at` dan `updated_at`. Uang disimpan sebagai integer Rupiah.

---

## 9. Rencana Rilis

| Fase | Isi | Hasil |
|---|---|---|
| **1** | Login dan peran, Project/Site/izin/foto, Keuangan dasar, Checklist + template awal, Tim, Dashboard, Docker, backup | Tim sudah bisa pakai di lapangan |
| **2** | Laporan harian + PDF, tracking tagihan, alat, kendaraan, export Excel | Operasional lengkap |
| **3** | Pembagian hasil per peran, kalender | Penyempurnaan |

Skema database dirancang untuk semua fase sejak awal agar tidak perlu bongkar ulang, tetapi dibangun dan dirilis bertahap.

## 10. Kriteria Keberhasilan

- Semua anggota bisa login dari HP dan memakai aplikasi tanpa diajari panjang.
- Catat pengeluaran lengkap dengan foto nota dalam di bawah 30 detik.
- Status semua site dan izin terlihat dalam satu layar.
- Data tetap aman setelah server restart dan bisa dipulihkan dari backup.
- Setelah 2 minggu, tim memakai aplikasi untuk pengeluaran dan status site secara rutin.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Tim malas mengisi | Form super singkat, tombol cepat, tampilkan manfaat langsung (saldo dan tagihan) |
| Sinyal jelek di lapangan | PWA dengan antrean offline |
| Server mati atau laptop rusak | Backup harian ke lokasi lain, skrip restore |
| RAM server terbatas | SQLite, satu container, hindari proses berat |
| HTTPS/kamera tidak jalan di HP | Gunakan Tailscale Serve atau Cloudflare Tunnel |
| Data keuangan bocor | Login wajib, tidak dibuka ke internet publik, hak akses per peran |

## 12. Keputusan Tim (sebelumnya pertanyaan terbuka)

1. Pembagian hasil: **berbeda per peran**, bagian diatur Admin per project.
2. Rigger melihat saldo/pemasukan: **tidak**.
3. Pengeluaran perlu persetujuan leader: **tidak**.
4. Cara akses: **Tailscale** (dipilih).
5. Notifikasi Telegram/WhatsApp: **tidak**.

---

## Lampiran A: Template Checklist Awal (bisa diedit)

**A1. Persiapan Tim Baru (sekali di awal)**
- Kontrak/perjanjian borongan jelas (ruang lingkup, nilai, termin, penalti)
- Kontak PIC provider dan PIC vendor/TP tersimpan
- Pembagian peran dan tanggung jawab tim disepakati
- Skema pembagian hasil disepakati
- Rekening/kas tim ditentukan
- Grup komunikasi tim dibuat
- Sertifikat/pelatihan kerja di ketinggian tiap anggota masih berlaku
- Asuransi/BPJS anggota dicek
- Mobil siap (pajak, servis, ban, P3K, APAR)
- Daftar alat tim lengkap dicatat

**A2. Persiapan Berangkat ke Site**
- Izin site (TP dan provider) sudah disetujui
- Jadwal dan akses site dikonfirmasi ke PIC
- Perangkat baru dan aksesori dicek jumlahnya (cocokkan dengan daftar)
- Alat kerja lengkap (kunci, crimping, kabel, konektor, grounding kit, label, tali, dll)
- Alat ukur dan konfigurasi siap (laptop, kabel konsol, alat alignment, kompas, power meter sesuai kebutuhan)
- APD lengkap: helm, full body harness, lanyard, sepatu safety, sarung tangan
- Peralatan pendukung: senter/headlamp, radio/HT atau HP terisi, powerbank
- Air minum, makanan, dan P3K
- Mobil terisi BBM, uang tol/parkir siap
- Briefing singkat pembagian tugas hari itu

**A3. Eksekusi Swap Microwave ZTE (per site)**
- Konfirmasi site dan sektor dengan NOC/PIC sebelum mulai
- Foto kondisi awal perangkat dan antena (before)
- Catat data perangkat lama (tipe, serial, konfigurasi)
- Backup konfigurasi perangkat lama bila memungkinkan
- Bongkar perangkat lama sesuai prosedur
- Pasang perangkat baru dan cek grounding serta weatherproofing konektor
- Alignment antena dan catat RSL
- Konfigurasi dan tes link bersama NOC
- Foto kondisi akhir (after), label kabel, kerapian
- Rapikan site dan bawa kembali perangkat lama sesuai ketentuan
- Isi laporan harian dan data site di aplikasi
- Siapkan dokumen untuk BAST

**A4. Setelah Selesai Site**
- Dokumen/foto lengkap diunggah
- Status site diubah ke "Dokumen/BAST"
- Tagihan diajukan, dicatat di aplikasi
- Pengeluaran hari itu semua sudah dicatat dengan nota

> Catatan: isi checklist di atas adalah titik awal umum. Sesuaikan dengan SOP resmi provider/vendor dan kebiasaan tim.

---

## Lampiran B: Catatan untuk Agen Pembuat (Hermes)

- Kerjakan **Fase 1** dahulu, tetapi buat skema database dan struktur kode yang siap untuk Fase 2 dan 3.
- Seluruh UI Bahasa Indonesia, mobile-first, tombol besar.
- Sediakan: `Dockerfile`, `docker-compose.yml`, `.env.example`, skrip backup dan restore, `README` singkat berisi cara deploy dan cara tambah user pertama (admin).
- Jangan memakai port 80, 443, 8000, 9443, 20128 (sudah terpakai); gunakan **8088**.
- Seed data awal: kategori pengeluaran dan template checklist (Lampiran A).
- Pastikan ada akun admin awal yang dibuat lewat environment atau perintah setup, bukan password default yang tertanam.
- Tulis tes sederhana untuk alur utama (login, buat site, catat pengeluaran, centang checklist).