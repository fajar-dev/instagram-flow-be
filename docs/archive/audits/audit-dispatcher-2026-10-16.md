> **Arsip audit.** Catatan ini merekam implementasi dan hasil uji pada tanggalnya; beberapa keputusan telah digantikan. Gunakan [indeks dokumentasi aktif](../../README.md) untuk perilaku, konfigurasi, dan prosedur saat ini.

> Arsip historis: mencatat kondisi dan keputusan pada tanggal dokumen. Bukan aturan atau panduan implementasi aktif; lihat [indeks dokumentasi](../../README.md).

# Audit dispatcher dan notifikasi — 2026-10-16

Pengguna memilih mempertahankan kontrol dispatcher di dashboard. Tabel settings bukan dead code: nilai dispatch.enabled dibaca worker dan perubahan disimpan bersama audit log. Tidak ada reset database pada audit ini.

## Perbaikan

- Halaman Integration Settings diberi judul Dispatcher dan hanya menampilkan kesiapan konfigurasi serta kontrol aktif/nonaktif.
- API settings mengembalikan dispatchEnabled, ready, webhookConfigured, serviceConfigured, signedMediaConfigured, mediaUrlConfigured. Removed: URL masked, contract, batas upload, status Telegram manual, daftar template kosong dan flag rendering konstan.
- Kesiapan memakai parsing URL HTTPS yang valid tanpa embedded credentials. Validasi sama digunakan saat mengaktifkan dispatcher dan setiap worker tick. Watchdog tetap berjalan saat dispatch dimatikan/tidak siap.
- Kesiapan adalah pemeriksaan konfigurasi, bukan jaminan webhook sedang online. Kegagalan pengiriman tetap mengikuti retry/outbox.
- Batas upload dipindahkan ke GET /api/batches/limits (authenticated) dalam feature content. Frontend memakai respons backend; tombol/input upload dinonaktifkan sebelum batas tersedia.
- Validasi frontend menggunakan minimum maxBatchFiles/maxJobFiles karena alur upload memproses seluruh batch dalam satu job. File kosong, terlalu besar atau tipe tidak didukung ditolak sebelum upload.
- TELEGRAM_NOTIFICATION_ENABLED dihapus dari konfigurasi aplikasi karena status tersebut tidak memeriksa integrasi nyata dan Telegram dikelola workflow n8n.
- Semua UAlert di frontend dihapus. Notifikasi request/simpan memakai toast; error upload memakai toast saat error berubah. Teks status/empty state/instruksi tetap dekat kontrol, bukan toast berulang setiap polling.
- Tidak ada perubahan pada credential atau data aplikasi; tabel settings tetap digunakan sesuai pilihan pengguna.

## Verifikasi

Pengujian mencakup readiness URL, toggle dispatcher dan redaksi respons, blok dispatch saat secret hilang, endpoint batas upload, batas file frontend, serta toast deduplication pada useLatestRequest. Browser belum diuji pada audit ini.
