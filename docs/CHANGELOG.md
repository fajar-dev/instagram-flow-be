# Riwayat perubahan IG Flow — backend

## 2026-10-19 — Instagram multi-account publishing

- Credential JSON privat, daftar akun di Settings, dan pemeriksaan koneksi.
- Publikasi langsung/terjadwal untuk gambar feed/story dengan snapshot revisi/JPEG di MinIO.
- Worker terpisah dengan lease, idempotency, cancellation, retry dan rekonsiliasi outcome ambigu.
- Migration publications, kontrak API, terjemahan dan test regresi.
- Belum diuji ke akun Instagram nyata karena credential belum diisi.

> Entri lama adalah riwayat pada tanggalnya, bukan panduan aktif. Lihat [indeks dokumentasi](README.md) untuk implementasi saat ini.

## 2026-10-19 — Dokumentasi produk

- Mengganti panduan template dengan dokumentasi produk IG Flow berdasarkan source aktif.
- Menyelaraskan setup, peta fitur/halaman, API, storage, migration, UI, dan aturan kontribusi.
- Menandai audit/PRD lama sebagai arsip; membedakan batas fitur, konfigurasi dan hasil uji nyata.
- Tidak mengubah runtime, environment, schema database atau workflow deployment.

## 2026-10-18 — Live n8n integration

- Added modular importable n8n workflow using OpenAI-compatible vision/caption requests, MinIO presigned media, authenticated callbacks and internal review.
- Added local reverse-tunnel deployment instructions; backend and MySQL remain local per user choice.
- Made same-execution claim retries idempotent while preserving competing-execution exclusion.
- Verified real upload → dispatch → AI → MinIO renders → revision → internal approval, duplicate result handling and webhook validation. See [verification report](AUDIT-N8N-2026-10-18.md).


Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.2] — 2026-10-15

### Changed
- Seeder user menggunakan tiga fixture dummy deterministik di user.seeder.ts, tanpa SEED_USER_*.
- Command tetap idempotent: akun existing tidak diubah; password dummy di-hash melalui UserService.

## [1.5.1] — 2026-10-15

### Changed
- Seeder user disatukan dalam user.seeder.ts; file implementasi dan module seeder terpisah dihapus.
- index.ts hanya koordinator seed; command seed dan seed:users tetap tersedia. Test dan aturan composition root CLI diperbarui.

## [1.5.0] — 2026-10-15

### Fixed
- Status akun pada access/refresh token, encoding email reset, redaksi token pada log, penghapusan foto nullable, serta source database yang terabaikan Git.

### Changed
- SMTP diinjeksikan dan ditunggu; kegagalan pengiriman mengembalikan 500. Storage memakai controller/service/adapter; list user bertipe; repository reset hanya expose use case.
- Tambah typecheck dan test regresi dengan adapter eksternal terisolasi. Keputusan dan batas dicatat di AUDIT-2026-10-15.md.

## [1.4.1] — 2026-10-15

### Changed
- Folder migration dipindahkan ke src/database/migrations agar satu induk dengan seeders; import, konfigurasi, test, dan dokumentasi diperbarui tanpa mengubah identitas migration.

## [1.4.0] — 2026-10-15

### Changed
- Request/resend menambah token reset tanpa membatalkan tautan sebelumnya; reset berhasil menghapus semua token user secara atomik.
- Migration baru menghapus unique user_id tanpa menghapus data token existing.
- Migration memakai CLI TypeORM (run/revert/show/generate/create); seeder melalui src/database/seeders dengan command seed dan seed:users, tanpa job.
- Test E2E mencakup resend, penghapusan semua token, isolasi antaruser, dan reset bersamaan menggunakan token berbeda.

## [1.3.0] — 2026-10-15

### Added
- Seeder user melalui `bun run seed:users` / `bun run seed`, dengan konfigurasi SEED_USER_NAME, SEED_USER_EMAIL, SEED_USER_PASSWORD.
- Seeder memvalidasi input, membuat user aktif dengan password hash, dan melewati email existing tanpa perubahan.
- Test integrasi login user hasil seed, idempotensi, dan penolakan konfigurasi invalid.

## [1.2.0] — 2026-10-15

### Changed
- Schema sync dinonaktifkan pada semua environment, termasuk test; schema dikelola melalui migration.
- Setup E2E membangun database kosong dengan migration aplikasi.

### Added
- Migration per tabel users dan contacts; migration password_reset_tokens tetap dipertahankan sesuai history.
- Pengujian inisialisasi database kosong, idempotensi runner, dan preservasi data existing.

## [1.1.0] — 2026-10-15

### Changed
- Token reset password dipisahkan dari users ke password_reset_tokens dengan hash SHA-256, expiry 10 jam, dan satu token per user.
- Reset password mengonsumsi token secara atomik; token lama diganti saat meminta tautan baru.
- Token milik akun nonaktif atau email yang sudah berubah ditolak.

### Added
- Entity dan repository reset token, FK cascade, migrasi token lama, serta perintah `bun run migration:run`.
- Test E2E penyimpanan, konsumsi sekali pakai, kedaluwarsa, concurrency, cascade, dan migrasi.

## [1.0.0] — 2026-10-15

### Changed
- Backend menggunakan MySQL saja melalui `mysql2`, dengan default port 3306.
- Pemilihan driver melalui environment dihapus; koneksi aplikasi dan test selalu memakai MySQL.
- Docker Compose menggunakan MySQL 8.4, health check MySQL, dan volume `mysql_data`.
- Setup test, template environment, serta panduan proyek diselaraskan dengan MySQL.

### Removed
- Dependency driver database alternatif dan cabang SQL khusus driver tersebut.

## [0.1.0] — 2026-06-18

### Added
- Initial release

---

## Template Entri Baru

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- Fitur baru

### Changed
- Perubahan pada fitur yang sudah ada

### Deprecated
- Fitur yang akan dihapus di versi mendatang

### Removed
- Fitur yang dihapus

### Fixed
- Perbaikan bug

### Security
- Perbaikan keamanan
```

### Versioning Rules

- **MAJOR** (X.0.0): Breaking changes, perubahan arsitektur besar
- **MINOR** (0.X.0): Fitur baru, module baru, penambahan endpoint
- **PATCH** (0.0.X): Bug fix, perbaikan kecil, update dependencies

## 2026-10-16 — Social Agent V1

- Add MySQL social schema, user roles, private image storage, staged batch uploads, process idempotency and durable outbox.
- Implement n8n V0.2 adapter, authenticated atomic claim/manifest/result/failure, dispatcher CLI with leases/backoff/watchdog.
- Add immutable AI suggestions, revision editing, version-locked internal review, ownership-scoped media, logs/settings and strict SVG image sandboxing.
- User CRUD now requires ADMIN. Existing accounts default UPLOADER; bootstrap via social:admin explicitly.
- Setup, tradeoffs and live integration limits: README_SETUP.md and docs/content-automation/IMPLEMENTATION.md.

## 2026-10-16 — Social module refactor

Split social controllers/services/validators/entities into batch, media, job, workflow, draft, settings and reporting. Shared transactional repository and ownership context preserve atomic operations. Composition root supports test adapters. API/schema unchanged. See [refactor notes](content-automation/REFACTOR-2026-10-16.md).

### Final feature layout and storage correction

Removed social umbrella folders. Features and their related children now live at the top level, with per-feature composition roots. Frontend routes have legacy aliases. Runtime content storage reuses the original MinIO helper with a private bucket; a verified/resumable command preserves existing local data. See the refactor document for the final structure.


## 2026-10-16 — Audit konsistensi lanjutan

Pisahkan repository reporting, gunakan serializer eksplisit per fitur, pindahkan retry ke service, satukan pagination dan header auth, seragamkan ApiResponse frontend, serta perbaiki batch FAILED saat dispatch habis. Bersihkan penamaan internal modul lama dan perbarui dokumentasi. Lihat audit 2026-10-16.

## 2026-10-16 — Audit alur dan composition root

Hapus aggregator src/modules/workflow.module.ts; routes dan CLI mengimpor module pemilik fitur. Dependency transaksi bersama diwiring oleh shared.module.ts. Link reset memakai FRONTEND_URL, bukan APP_URL; batas aset mengabaikan arsip; retry menghormati retryable. Editor tidak lagi memberi toast sukses setelah reload gagal, input dibekukan saat save/reload, dan payload proses tetap stabil saat retry jaringan. Validasi reset password frontend mengikuti kebijakan backend existing (minimum 6). Pengujian browser belum bisa dilakukan: origin localhost:3000 ditolak oleh izin browser tersimpan.

## Route consolidation

Seluruh deklarasi endpoint sekarang berada di src/routes/api.ts, termasuk health dan dokumentasi OpenAPI. src/routes/social.ts dihapus. index.ts hanya memasang middleware global, memanggil registerRoutes(app), dan mengatur error/startup. Test memakai fungsi registrasi yang sama. URL /health, /api/docs, /api/swagger.yaml dan seluruh /api/* tetap sama. Body limit/auth/mutation limiter fitur dibatasi ke /social/*; signed-media dan callback service tetap didaftarkan sebelum auth pengguna.

### 2026-10-16 — Reporting query and pagination audit

- Validate reporting query parameters at the API route boundary with the standard validation hook.
- Return zero item ranges on empty/out-of-range pages; add API regression coverage and document the pagination response in Swagger.

### 2026-10-16 — Equal access and object-only media

- Remove application roles, owner-only visibility, role bootstrap command and role fields. Forward migration drops users.role; applied history is preserved.
- Store SVG renders in private MinIO, migrate existing inline media with byte verification, and remove local-media importer/config/adapter.
- Extract render storage/sanitization; remove dead read-path actor parameters; add shared-access, migration and rollback tests.
- See `AUDIT-EQUAL-ACCESS-2026-10-16.md` for exact behavior and verification.

## 2026-10-16 — Configuration consolidation

Unified backend environment template, runtime numeric parsing, shared database options and migration registry; removed duplicated PM2/Compose settings. Documented separate avatar/private-content bucket responsibilities in ENVIRONMENT.md. Frontend control sizes share one theme default and API URL has a development fallback.

## 2026-10-16 — Unified object storage

All media now uses MINIO_BUCKET; removed MINIO_MEDIA_BUCKET and the generic /api/proxy route/helper/service. Avatars already use direct presigned MinIO URLs. Existing content needs verified copying into the unified bucket before deployment. This supersedes the earlier two-bucket decision.

Local consolidation verified 28 existing content objects by SHA-256 in the main bucket. The old bucket is retained only as a backup and is no longer referenced by runtime configuration.

## 2026-10-16 — Feature API routes

Removed the /api/social prefix. Feature resources now live directly under /api (batches, jobs, drafts, review, media, assets, renders, overview, audit-logs, settings and media-access). Backend api.ts explicitly applies authentication and mutation/body limits per route, matching contact/user. Service-secret callbacks and signed-media validation remain separate. Frontend services, tests, Swagger and generated media URLs use the new paths. Legacy frontend /social aliases are removed. Deploy frontend/backend together and re-import the updated n8n workflow; existing in-flight manifests may still reference the previous URLs.

## 2026-10-16 — Reset baseline dan audit struktur

Baseline migration/database direset atas instruksi pengguna. Runtime tidak lagi memakai nama social; config dan terjemahan dipisah per fitur, dispatcher menjadi jobs:dispatch. Form contact berbagi fields/validasi dan tidak lagi tertutup saat klik di dalam modal. Lihat backend/docs/AUDIT-BASELINE-2026-10-16.md untuk detail dan batas verifikasi.

## 2026-10-16 — Dispatcher dan notifikasi

Kontrol dispatcher dashboard dipertahankan sesuai pilihan pengguna. Status statis/deployment yang tidak diperlukan dihapus; readiness divalidasi saat toggle dan worker tick. Upload mengikuti batas backend melalui /batches/limits. UAlert frontend dihapus; toast menjadi notifikasi utama, dengan teks untuk status kontekstual. Lihat backend/docs/AUDIT-DISPATCHER-2026-10-16.md.

## 2026-10-18 — Audit config dan env

Hapus API_KEY dan middleware yang tidak pernah digunakan, termasuk persyaratan startup production yang tidak relevan. JWT dan n8n service authentication dipertahankan. Template/local env diperiksa berdasarkan consumer runtime, test, dan deployment; lihat AUDIT-CONFIG-2026-10-18.md.

## 2026-10-18 — MinIO presigned media

n8n preview URLs now reuse MinIO presigning. Removed MEDIA_SIGNING_SECRET and the custom media-access route; manifest/render validation and dispatcher readiness were updated. See backend/docs/AUDIT-PRESIGNED-MEDIA-2026-10-18.md.

## 2026-10-18 — Upload error isolation

Preserve specific unsupported-format validation errors instead of replacing them in the decoder catch. Oversized image resolution now has an explicit error. Added regression coverage for valid → invalid → valid uploads in the same batch.

## 2026-10-18 — Stale callback tunnel recovery

Diagnosed n8n execution 7 HTTP 504 at Claim Job: the local tunnel process was absent while its remote SSH listener remained bound. Removed only the verified stale tunnel session, restored a detached SSH tunnel, and replayed the existing unclaimed dispatch event. Updated tunnel runbook to distinguish callback connectivity from SVG generation and document recovery.

## 2026-10-18 — Content editor URL

Workflow manifests now link to `/content/:jobId/edit`, matching the unified Content frontend. Callback endpoints and workflow contracts are unchanged. Added a manifest URL assertion to the integration suite.

## 2026-10-18 — Content status counts

Added authenticated `GET /api/content/counts?days=30` via reporting controller/service/repository. Two grouped queries return job lifecycle and current draft-review totals, including zero statuses and avoiding counting approved drafts as ready jobs. Date scope matches the existing lists. Tests cover authentication, validation, transitions, list agreement and old-record exclusion.

## 2026-10-18 — Progressive gallery previews

Added authenticated `/assets/:assetId/previews` returning existing MinIO presigned URLs for the normal preview and a 32px JPEG thumbnail. ThumbnailService generates missing derivatives lazily for new and existing assets, stores them in the same private bucket, and deduplicates concurrent generation. Both S3 GET NoSuchKey and HEAD NotFound are handled; other storage errors remain errors. No database migration, media proxy or local media storage is introduced. Archived assets cannot obtain fresh URLs.

## 2026-10-18 — Date picker and uploader avatars

Reporting lists include uploaderPhoto using the existing private MinIO URL resolver, alongside uploaderName. Controller awaits serialization; tests cover absent and signed profile photos.

## 2026-10-19 — Remove Contact

Removed the Contact application feature, endpoints, entities, UI, types, client, translations and dedicated tests. Shared auth, logging, language and pagination tests now use supported User endpoints. User is the active CRUD reference. Historical audit records remain unchanged.

Backend migration `1792368000000-drop-contacts` removes the retired table. Applied migration history is preserved; reverting restores only the empty schema, not deleted data.

## 2026-10-19 — Rebuild development migration baseline

At explicit user request before production, replaced the previous migration chain with 13 ordered create-table files, one per active table. Removed both Contact creation and deletion migrations. DDL for retained tables is unchanged. Local migration metadata is reconciled only when the applied history matches the complete previous baseline; application data is preserved. Other development databases must be explicitly reconciled or recreated.

## Instagram Login

Publishing memakai graph.instagram.com dan Instagram User access token. Kebutuhan Facebook Page serta pageId/pageAccessToken dihapus dari konfigurasi dan kontrak akun. Token lama tidak dikonversi otomatis; isi accessToken Instagram Login di JSON privat.

## 2026-10-19 — AI analysis identifier recovery

Execution 12 failed in Parse Analysis because one model-returned asset ID was absent from the five-image manifest. Analysis prompts now use short deterministic aliases, resolved back to exact manifest IDs before validation. Unknown/duplicate IDs remain rejected. Workflow regenerated, backed up and deployed to n8n; regression tests cover alias mapping and rejection.

## 2026-10-19 — Live Instagram publishing

Fixed an unnecessary HTTPS-only validation that blocked the existing public HTTP MinIO endpoint. Publication URLs continue to use MinIO presigned access with a private bucket; other URL protocols remain rejected. Added a regression test for both HTTP/HTTPS and unsupported protocols. Live tests use explicitly synthetic content, with immediate and scheduled publication through the existing worker.

## 2026-10-19 — Ready → Publish / Reject

Removed intermediate review decisions. One project now targets one account and one publication, enforced with a unique project constraint and serialized decisions. Publish starts delivery directly; Reject preserves the revision/hash guard. The editor locks after either decision, and failed delivery retries the same publication. Content tabs, counts, overview, API contracts, translations and migration history are aligned.
