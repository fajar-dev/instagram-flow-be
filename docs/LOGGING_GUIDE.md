# Logging dan diagnosis IG Flow

Gunakan `logger` dari `src/core/helpers/logger.ts`. Setiap entry berupa JSON dengan timestamp UTC, level, service (`APP_NAME`), environment, message dan field konteks. Logger menulis stdout/stderr dan `logs/app-YYYY-MM-DD.log`; rotasi/retensi file belum disediakan aplikasi.

Request middleware menambahkan `X-Request-Id`, method, path, query yang disaring, status dan durasi. Parameter query dengan nama token/password/secret/authorization/code/api-key disamarkan. Jangan menganggap seluruh payload otomatis disanitasi: hindari mencatat header auth, password, reset link, signed URL atau environment.

## Diagnosis proses konten

1. Cari job ID dan status/safe error di dashboard.
2. Cocokkan request ID dengan log API jika request gagal sebelum antrean.
3. Untuk QUEUED/DISPATCHED, periksa worker, sakelar dispatcher, outbox dan koneksi webhook.
4. Untuk PROCESSING/FAILED, periksa execution n8n serta callback yang sesuai.
5. Untuk claim 504 pada setup lokal, cek backend dan SSH tunnel sebelum mendiagnosis model AI.

Audit log adalah data aktivitas domain di MySQL; log aplikasi adalah diagnosis operasional. Jangan mengirim stack trace atau log n8n penuh ke response frontend. `/health` hanya melaporkan state inisialisasi database, bukan pemeriksaan semua dependency.

Kelola retensi dan akses file log pada deployment. Panduan tunnel dan pemulihan ada di [runbook n8n](../integrations/n8n/README.md).
