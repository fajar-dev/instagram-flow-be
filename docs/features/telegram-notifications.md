# Notifikasi Telegram

Backend mengantrekan satu notifikasi per job ketika callback AI berhasil menyimpan draft READY_FOR_REVIEW. Notifikasi berisi satu gambar cover hasil AI, caption lengkap, hashtag dan tombol **Buka detail konten** menuju FRONTEND_URL/content/:jobId. Pesan tidak memuat token, URL media privat ; gambar dikirim sebagai berkas, bukan tautan privat. Halaman detail tetap membutuhkan login; frontend mempertahankan tujuan melalui parameter redirect.

## Konfigurasi

Isi environment API dan worker jobs:dispatch yang sama:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
FRONTEND_URL=https://alamat-aplikasi-anda
```

Buat bot melalui @BotFather dan simpan token hanya di environment privat. Untuk chat pribadi, pengguna perlu membuka bot dan menekan Start; untuk grup, tambahkan bot dan izinkan mengirim pesan. Isi chat ID tujuan (ID grup biasanya negatif). FRONTEND_URL harus dapat dibuka oleh penerima, bukan localhost. Jangan gunakan endpoint callback API sebagai FRONTEND_URL.

Kedua nilai Telegram kosong berarti fitur nonaktif. Konfigurasi hanya satu nilai ditolak saat startup. Token/tujuan yang diisi setelah job selesai tidak memicu notifikasi historis. Jangan mengganti bot token ke bot lain saat antrean lama masih tertunda tanpa meninjau tujuan chat yang telah tersimpan.

Jalankan migration baru, restart API PM2 dan worker jobs:dispatch Supervisor setelah mengubah environment. Tidak perlu webhook Telegram, node Telegram di n8n, worker baru, atau perubahan database credential.

## Antrean dan batas pengiriman

Baseline CreateJobNotifications1792490400013 membuat tabel job_notifications lengkap dengan snapshot bagian pesan dan posisi pengiriman. Enqueue berada dalam transaksi hasil AI yang sama; unique job_id dan pemeriksaan callback idempotent mencegah enqueue ganda. Tidak ada request Telegram di transaksi callback.

Worker jobs:dispatch mengirim antrean bersamaan dengan dispatch AI, termasuk ketika sakelar dispatch AI di Settings dimatikan. Lock database mencegah dua worker mengirim baris yang sama bersamaan. Chat ID, URL detail dan nama proyek disimpan sebagai snapshot; bot token hanya di environment.

- PENDING: menunggu pengiriman.
- SENDING: sudah diambil worker; lease 180 detik, timeout HTTP 60 detik.
- SENT: Telegram mengonfirmasi dan message_id disimpan.
- FAILED: penolakan Telegram (misalnya bot diblokir/chat tidak ditemukan) atau batas lima percobaan retry tercapai.
- UNKNOWN: jaringan timeout, respons tidak dapat dipastikan, atau worker berhenti saat SENDING. Tidak dikirim ulang otomatis.

Respons 429 eksplisit dicoba ulang sesuai retry_after. Kegagalan membaca cover sebelum request dikirim aman dicoba ulang setelah 60 detik. Telegram sendMessage tidak menyediakan kunci idempotency; hasil ambigu tidak boleh diklaim pasti gagal ataupun dikirim ulang tanpa pemeriksaan chat. Status FAILED/UNKNOWN dicatat dengan notification ID saja di log worker. Operator meninjau chat dan konfigurasi sebelum memperbaiki status melalui prosedur operasi; fitur ini belum menyediakan tombol retry/admin endpoint. Job konten tetap READY_FOR_REVIEW meskipun pengiriman Telegram gagal.

Jika caption beserta hashtag maksimal 1.024 karakter, semuanya digabung dalam satu pesan sendPhoto. Jika lebih panjang, cover dikirim sekali melalui sendPhoto, disusul teks lengkap melalui sendMessage. Detail proyek, judul dan status tidak ditambahkan ke teks notifikasi. Teks panjang dipecah tanpa dipotong; progres disimpan setelah setiap bagian berhasil. Bagian berikutnya dijadwalkan minimal satu detik kemudian. Retry teks tidak mengirim ulang cover yang sudah berhasil. Foto lain dan analisis AI tidak dikirim. Story tanpa caption/hashtag hanya mengirim cover dan tombol detail. SENT berarti semua bagian selesai; UNKNOWN dapat berarti sebagian notifikasi sudah diterima.

## Verifikasi

Tes memakai transport palsu, bukan pesan sungguhan: payload tombol, plain text tanpa parse_mode, callback paralel, satu enqueue per job, single delivery antarworker, rate limiting, timeout dan pemulihan lease kedaluwarsa. Pengujian end-to-end Telegram membutuhkan token/chat ID nyata.

Referensi: [sendMessage](https://core.telegram.org/bots/api#sendmessage) dan [InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton).
