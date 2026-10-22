# Konfigurasi IG Flow backend

`src/config/config.ts` merupakan parser runtime tunggal. Template yang dilacak adalah `.env.dist`; `.env` lokal tidak boleh masuk Git. Nilai secret tidak ditampilkan di dokumentasi atau dashboard. Tabel berikut mencatat perilaku parser, bukan nilai environment deployment saat ini.

## Aplikasi dan database

| Variable | Default parser / fungsi |
| --- | --- |
| NODE_ENV | development; production mewajibkan JWT secrets |
| APP_NAME | hono-be, label service log; dapat diatur menjadi ig-flow |
| PORT | 4000 |
| APP_URL | http://localhost:PORT, origin API |
| FRONTEND_URL | http://localhost:3000, origin dashboard/link |
| JWT_SECRET, JWT_REFRESH_SECRET | Wajib nonkosong di production; fallback development bukan secret deployment |
| DB_HOST, DB_PORT | 127.0.0.1, 3306 |
| DB_USER, DB_PASS | root, kosong |
| DB_NAME | hono_be; nama schema dapat disesuaikan |
| DB_TEST_NAME | hono_be_test; wajib terpisah dan berakhiran _test untuk suite |
| DB_ROOT_PASS | Hanya docker-compose.yaml untuk MySQL root, tidak dibaca parser aplikasi |

Nama default lama di parser/template/container dipertahankan untuk kompatibilitas lingkungan. Identitas produk dokumentasi adalah IG Flow. Mengubah nama database atau bucket tidak memindahkan data lama secara otomatis. Tidak ada environment untuk mengaktifkan synchronize.

## Email dan Google

| Variable | Default / fungsi |
| --- | --- |
| SMTP_HOST, SMTP_PORT | smtp.gmail.com, 587 |
| SMTP_USER, SMTP_PASS | Credential SMTP; default kosong |
| SMTP_FROM | Default label Hono BE dengan noreply@example.com; sesuaikan pengirim IG Flow yang valid |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google OAuth backend; default kosong |

Frontend memakai client ID publik yang sesuai. Client secret hanya di backend. Login email/password tidak bergantung pada Google. Request reset password memerlukan SMTP yang benar-benar menerima email.

## Object storage

| Variable | Default / fungsi |
| --- | --- |
| MINIO_ENDPOINT, MINIO_PORT | 127.0.0.1, 9000; endpoint host sesuai SDK MinIO |
| MINIO_USE_SSL | true hanya jika string bernilai true; selain itu false |
| MINIO_ACCESS_KEY, MINIO_SECRET_KEY | Credential, default kosong |
| MINIO_BUCKET | hono-be; satu bucket privat untuk semua media |
| SIGNED_MEDIA_URL_TTL_SECONDS | 3600, dibatasi maksimum 86400 |
| MAX_UPLOAD_MB | 15 per file |
| MAX_BATCH_FILES | 19, dibatasi maksimum 19 |

Endpoint MinIO harus dapat dijangkau oleh konsumennya. Manifest n8n memakai presigned preview langsung; URL tidak boleh diubah host/path/query setelah signing. Tidak ada MEDIA_SIGNING_SECRET, bucket media kedua, atau proxy generik.

## n8n dan worker

| Variable | Default / fungsi |
| --- | --- |
| N8N_WEBHOOK_URL | Kosong; URL HTTPS webhook proses |
| N8N_WEBHOOK_AUTH_TOKEN | Kosong; credential backend → n8n |
| N8N_BACKEND_SERVICE_TOKEN | Kosong; credential callback n8n → backend |
| N8N_WEBHOOK_TIMEOUT_MS | 15000; timeout pengiriman event, bukan durasi AI |
| MAX_FILES_PER_AI_JOB | 19, dibatasi maksimum 19 |
| PROCESSING_TIMEOUT_SECONDS | 7500; watchdog, minimum 7500 untuk workflow multi-gambar |
| OUTBOX_RETRY_MAX | 5 |
| OUTBOX_RETRY_BACKOFF_SECONDS | 30 |

Workflow yang disertakan di integrations/n8n memakai **camelCase**; tidak ada pengaturan pemilihan format kontrak. Endpoint/model AI dan API key dikelola di n8n Configuration/credential, tidak di frontend atau tabel settings.

Parser angka menerima integer positif; input tidak valid menghentikan startup. Batas batch dan job dapat berbeda: upload lolos belum berarti seluruh batch memenuhi batas proses. Frontend memperoleh batas dari GET /api/batches/limits.

Sakelar dispatchEnabled tetap berada di tabel settings dan dapat diubah di dashboard. Ready memeriksa webhook HTTPS/token, service token, dan kelengkapan storage; bukan ping atau bukti kesehatan layanan. Worker tetap harus dijalankan terpisah.

Panduan setup/tunnel ada di [Setup](setup.md) dan [runbook n8n](n8n.md).

## Credential Instagram

INSTAGRAM_CREDENTIALS_FILE menunjuk JSON privat, default secrets/instagram-accounts.json. Token dan app secret hanya ada di file ini; jangan letakkan dalam database atau frontend. JSON memuat graphVersion dan array akun. Lihat [publishing](../features/instagram-publishing.md). Tidak ada environment token Instagram kedua.

## Redis Analytics

| Variable | Default / fungsi |
| --- | --- |
| REDIS_HOST | 127.0.0.1; host Redis |
| REDIS_PORT | 6379; integer positif |
| REDIS_PASSWORD | Kosong; password hanya di environment privat |
| REDIS_TLS | false; true untuk endpoint Redis TLS |

Redis menyimpan cache analytics selama 300 detik, bukan credential, job atau jadwal publish. Prefix `ig-flow:<NODE_ENV>:analytics:v1` memisahkan environment; key mencakup identitas akun dan parameter query. Tidak menjalankan FLUSHDB/FLUSHALL dan tidak mengubah konfigurasi server Redis bersama. Jika Redis tidak tersedia, Analytics mengambil langsung dari Meta. `/health` tetap memeriksa database, bukan Redis. Tidak ada perubahan schema MySQL.
