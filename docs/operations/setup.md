# Setup dan operasi IG Flow

## Backend lokal

1. Install dependency dengan `bun install` di direktori backend.
2. Buat `.env` dari `.env.dist` hanya jika belum ada; atur MySQL, JWT, SMTP, Google OAuth, dan MinIO sesuai [konfigurasi](environment.md).
3. Buat database aplikasi dan database pengujian terpisah. Jalankan `bun run migration:show`, kemudian `bun run migration:run`.
4. Untuk development, jalankan `bun run seed:users`. Jangan gunakan akun demo untuk deployment yang dapat diakses publik.
5. Jalankan `bun run dev`; periksa `GET /health` dan `/api/docs`.
6. Jalankan frontend mengikuti [README frontend](../../../frontend/README.md).

Baseline final 21 Oktober 2026 berisi 13 migration untuk 13 tabel, termasuk publications. Database dengan history lama memerlukan rekonsiliasi eksplisit atau pembuatan ulang database development; lihat [database](database.md). Aplikasi tidak menjalankan migration/seeder otomatis saat startup.

## Pemrosesan AI

1. Siapkan MinIO yang dapat diakses backend, browser untuk URL presigned, serta n8n/gateway vision.
2. Import workflow yang dibangun dari `integrations/n8n/`. Atur tiga credential Header Auth di n8n, kemudian publish workflow.
3. Workflow dan backend menggunakan camelCase. Set webhook HTTPS, token webhook, dan token backend service yang berpasangan.
4. Sediakan jalur callback dari n8n ke backend. Setup pengujian saat ini memakai SSH reverse tunnel ke MacBook; instruksi lengkap di [runbook n8n](n8n.md).
5. Jalankan `bun run jobs:dispatch` pada proses terpisah. `bun run jobs:dispatch --once` menjalankan satu sweep.
6. Aktifkan dispatcher melalui Settings. Status ready memeriksa keberadaan/format konfigurasi, bukan konektivitas live.
7. Uji unggah → proses → claim → hasil → ready for review → publish atau reject dengan foto uji, lalu periksa status job dan audit log.

Worker memeriksa antrean setiap sekitar tiga detik, menjalankan retry/backoff dan watchdog. Menonaktifkan dispatcher menghentikan pengiriman baru; watchdog tetap berjalan. Migrasi dan seeder tidak dijalankan oleh worker.

## Docker

`docker-compose.yaml` menyediakan app dan MySQL 8.4. MinIO, SMTP, n8n, worker, dan tunnel tidak termasuk dalam compose tersebut. `DB_ROOT_PASS` digunakan oleh compose, bukan parser runtime backend. Jalankan migration secara eksplisit setelah MySQL siap dan sebelum menerima trafik aplikasi. Nama container/volume legacy masih ada di file compose; jangan mengganti volume tanpa rencana pemindahan data.

## Penyimpanan dan pemulihan

Satu bucket privat menyimpan avatar, original, preview JPEG, thumbnail, dan render. Backup MySQL serta bucket secara berpasangan. Jangan mengubah host URL setelah ditandatangani MinIO. Tidak ada media proxy generik, local-media fallback, atau secret penandatanganan media terpisah.

Saat job gagal, periksa safe error di dashboard, log backend, dan execution n8n. Untuk 504 pada claim, periksa backend dan tunnel sebelum mengubah prompt AI. Retry dari dashboard setelah penyebab pulih. Jangan mengubah status atau execution ID langsung di database.

Setup tunnel lokal bergantung pada MacBook dan koneksinya. Deployment selalu aktif, retensi objek, serta latihan pemulihan backup memerlukan pengaturan operasional tersendiri. Form konten final dan pilihan jadwal diisi saat publish; worker publikasi menangani pengiriman ke Instagram.

## Publikasi Instagram

Jalankan migration baru, isi JSON privat dari contoh di secrets/, lalu jalankan `bun run posts:dispatch` terpisah dari dispatcher AI. Lihat [panduan lengkap](../features/instagram-publishing.md). Tidak diperlukan webhook Instagram untuk alur publish ini.

## Menjalankan backend build dengan PM2 dan Bun

Jalankan dari root backend agar `.env` dan `swagger.yaml` terbaca:

```sh
bun install --frozen-lockfile
bun run build
pm2 start dist/index.js --name instagram-flow-be --interpreter bun
pm2 save
curl http://127.0.0.1:8002/health
```

Contoh di atas memakai `PORT=8002` dan `APP_HOSTNAME=0.0.0.0`. Entry point memanggil `Bun.serve()` secara eksplisit, termasuk ketika PM2 memuatnya melalui `require()`. Status PM2 online atau pesan koneksi database saja belum membuktikan HTTP sudah listening; periksa log `HTTP server listening` dan endpoint `/health`. Startup gagal tidak meneruskan HTTP dan keluar dengan status gagal.

Root `/` tidak memiliki halaman frontend. Swagger tersedia di `/api/docs`; endpoint aplikasi memakai prefix `/api`. Reverse proxy harus mempertahankan prefix tersebut (contoh `proxy_pass http://127.0.0.1:8002;` tanpa trailing slash pada location `/api/`). Akses port langsung dari internet juga memerlukan aturan firewall/security group yang sesuai.

## Deployment server

Panduan PM2 untuk API, Supervisor untuk worker, konfigurasi nginx dan verifikasi tersedia di [DEPLOYMENT.md](../../DEPLOYMENT.md).
