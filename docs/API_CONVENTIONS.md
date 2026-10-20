# API IG Flow

Seluruh endpoint dideklarasikan di `src/routes/api.ts`. Prefix dashboard dan callback adalah `/api`, tanpa prefix fitur payung. `/health` berada di luar prefix dan bersifat publik. OpenAPI pada [swagger.yaml](../swagger.yaml) menjelaskan schema; validator dan serializer adalah implementasi kontraknya.

## Autentikasi dan format

Endpoint pengguna memakai `Authorization: Bearer <accessToken>` dan memeriksa akun aktif. Semua pengguna aktif mempunyai akses yang sama. Callback n8n memakai N8N_BACKEND_SERVICE_TOKEN yang terpisah dari JWT dan token webhook.

Response JSON dashboard sukses berisi `success`, `statusCode`, `message`, `data`, dan opsional `meta`. Error berisi `success: false`, `statusCode`, `message`, `errors`. Pagination meta berisi total, perPage, currentPage, lastPage, from, to. Gunakan ApiResponse dan serializer, bukan shape JSON baru.

Callback sukses n8n memakai format flat sesuai adapter legacy/camelCase. Response error tetap melalui error handler aplikasi. Media download/preview dapat berupa binary; endpoint URL preview memberikan URL presigned. Jangan memaksa seluruh endpoint media menjadi envelope JSON.

## Query dan mutation

Validator list bersama menerima page integer >=1, limit 1–100, q, sortBy dan order ASC/DESC. Default limit user 10 dan reporting 20. Reporting juga memvalidasi days 1–365 serta filter status/batch/output/uploader. Gunakan allowlist sorting repository.

Process dan retry memakai header Idempotency-Key; validator menerima 8–128 karakter alfanumerik, underscore atau dash. Callback menggunakan event ID, execution ID dan validasi hasil untuk mencegah claim bersaing serta duplikasi hasil. Publish mengirim expectedContentHash dan object content (primaryAssetId, title, caption, hashtags, location, activity), bersama accountKey, source, placement, scheduledAt. Reject mengirim contentHash dan notes. Konflik konten/status menghasilkan 409. Tidak ada endpoint PATCH draft.

Body divalidasi Zod; validasi schema umumnya 422, input domain invalid 400, auth 401, resource tidak ditemukan 404, konflik 409, batas body 413 dan rate limit 429. Pesan diterjemahkan melalui Accept-Language; properti dan status domain tetap camelCase/nilai kontrak tetap.

## Endpoint aktif

Daftar ini dicocokkan dengan registrasi route pada 19 Oktober 2026. Perbarui saat menambah/menghapus route.

| Method | Path | Akses |
| --- | --- | --- |
| POST | `/api/auth/register` | Publik |
| POST | `/api/auth/login` | Publik |
| POST | `/api/auth/google` | Publik |
| POST | `/api/auth/forgot-password` | Publik |
| GET | `/api/auth/validate-reset-token` | Publik |
| POST | `/api/auth/reset-password` | Publik |
| POST | `/api/auth/refresh` | Publik |
| GET | `/api/auth/me` | JWT user aktif |
| PUT | `/api/auth/profile` | JWT user aktif |
| PUT | `/api/auth/password` | JWT user aktif |
| POST | `/api/auth/logout` | JWT user aktif |
| GET | `/api/user` | JWT user aktif |
| GET | `/api/user/:id` | JWT user aktif |
| POST | `/api/user` | JWT user aktif |
| PUT | `/api/user/:id` | JWT user aktif |
| DELETE | `/api/user/:id` | JWT user aktif |
| POST | `/api/upload` | JWT user aktif |
| POST | `/api/jobs/:jobId/claim` | Service Bearer |
| POST | `/api/jobs/:jobId/result` | Service Bearer |
| POST | `/api/jobs/:jobId/failure` | Service Bearer |
| GET | `/api/jobs/:jobId/manifest` | Service Bearer |
| GET | `/api/content/counts` | JWT user aktif |
| GET | `/api/overview` | JWT user aktif |
| GET | `/api/batches/limits` | JWT user aktif |
| POST | `/api/batches` | JWT user aktif |
| GET | `/api/batches/:batchId` | JWT user aktif |
| POST | `/api/batches/:batchId/assets` | JWT user aktif |
| POST | `/api/batches/:batchId/process` | JWT user aktif |
| GET | `/api/jobs` | JWT user aktif |
| GET | `/api/jobs/:jobId` | JWT user aktif |
| GET | `/api/jobs/:jobId/result` | JWT user aktif |
| POST | `/api/jobs/:jobId/retry` | JWT user aktif |
| GET | `/api/review` | JWT user aktif |
| POST | `/api/drafts/:draftId/reject` | JWT user aktif |
| GET | `/api/media` | JWT user aktif |
| GET | `/api/assets/:assetId/previews` | JWT user aktif |
| GET | `/api/assets/:assetId/preview` | JWT user aktif |
| GET | `/api/assets/:assetId/download` | JWT user aktif |
| DELETE | `/api/assets/:assetId` | JWT user aktif |
| GET | `/api/renders/:renderId` | JWT user aktif |
| GET | `/api/audit-logs` | JWT user aktif |
| GET | `/api/settings` | JWT user aktif |
| PATCH | `/api/settings` | JWT user aktif |
| GET | `/api/instagram/accounts` | JWT user aktif |
| POST | `/api/instagram/accounts/:accountKey/verify` | JWT user aktif |
| GET | `/api/drafts/:draftId/publications` | JWT user aktif |
| POST | `/api/drafts/:draftId/publications` | JWT user aktif |
| POST | `/api/publications/:publicationId/cancel` | JWT user aktif |
| POST | `/api/publications/:publicationId/retry` | JWT user aktif |
| GET | `/api/publications/:publicationId/image` | JWT user aktif |
| GET | `/api/swagger.yaml` | Publik |
| GET | `/api/docs` | Publik |

Health mengembalikan state inisialisasi DataSource, timestamp, uptime, environment dan checks.database. Response 200/503 tidak membuktikan koneksi MinIO/SMTP/n8n. Endpoint publishing memerlukan JWT pengguna aktif; tidak ada endpoint Contact.
