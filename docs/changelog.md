## 21 Oktober 2026 — Audit alur aktif

## 23 Oktober 2026 — Microsoft login

- Tempatkan adapter Google/Microsoft dan helper token sesi di modul auth; hapus core/helpers/auth dan perbarui wiring serta tes.

- Integrasi MSAL dipisahkan ke adapter yang diinjeksi; pemeriksaan akun Google/Microsoft dan serializer sesi dipakai bersama.
- Penukaran code wajib PKCE dan redirect URI server, tanpa fallback Graph atau log error provider mentah.
- OpenAPI, konfigurasi Entra dan tes autentikasi diperbarui.

## 21 Oktober 2026 — Konsolidasi migration development

- 13 migration create-table langsung ke schema final; perubahan carousel disatukan ke publications.
- Hapus migration transisi dan kolom template/foto utama/media tunggal dari baseline.
- Tes fresh install, rollback, dan reapply disesuaikan; migration users tidak lagi menyamarkan tabel yang sudah ada.

Menghapus adapter n8n snake_case dan N8N_CONTRACT, template selector backend, primary asset pada draft/form, pembacaan render SVG, snapshot source/mediaKey serta endpoint preview publikasi satu gambar yang tidak dipakai. Kontrak aktif: camelCase, hasil AI JPEG, renderIds/mediaKeys berurutan. Migration 1792590000000 menghapus kolom yang tidak dipakai; tidak ada fallback runtime untuk data lama.

Daftar/statistik job memakai attempt terbaru. Retry dari attempt yang sudah digantikan ditolak dan tombol retry pada detail historis dinonaktifkan melalui retryable. Preview konten ditolak mengambil render AI, bukan foto mentah. Compiler backend mendeteksi local/parameter yang tidak terpakai. Dokumentasi API, operasional, aturan dan tests mengikuti kontrak aktif.

## 21 Oktober 2026 — Status proyek setelah retry

Daftar jobs, jumlah tab Content dan statistik Overview hanya menghitung attempt terbaru per batch, sebelum filter status/tanggal. Percobaan gagal sebelumnya tetap tersimpan untuk audit tetapi tidak muncul lagi sebagai proyek Failed setelah retry. Jika retry kembali gagal, proyek dihitung satu kali dengan job terbaru.

## 21 Oktober 2026 — Perbaikan validasi analisis foto

Memperbaiki kegagalan Parse Analysis ketika AI mengembalikan ranking yang valid tetapi daftar pilihan kosong. Kandidat cover sekarang ditentukan dari skor tervalidasi; kontrak analisis hanya meminta skor dan alasan untuk setiap foto. Validasi asset ID, duplikasi, cakupan foto dan rentang skor tetap ketat. Replay 15 respons dari execution 34 berhasil. Pengujian ulang juga menemukan timeout unduhan URL pada penyedia gambar; workflow sekarang mengunduh referensi/foto di n8n, memvalidasi ukuran dan format, lalu mengirim data gambar langsung ke gateway. Tidak mengubah API aplikasi. Verifikasi: 200 tes backend, typecheck, lint dan build lulus. Workflow sudah diaktifkan di server; retry batch 15 foto pada execution 36 berhasil, job mencapai READY_FOR_REVIEW dengan 15 render AI JPEG 1080×1350. Tidak melakukan publikasi Instagram.

## 21 Oktober 2026 — Konsolidasi baseline development

Menggabungkan schema output tunggal langsung ke migration create-jobs dan menghapus migration transisi. Baseline kembali menjadi 13 file untuk 13 tabel. Test baseline tetap memverifikasi rollback/reapply; test khusus migration transisi dihapus. Database aplikasi diselaraskan melalui backup, perbandingan schema dengan database test, lalu rekonsiliasi ledger tanpa reset tabel aplikasi.

## 21 Oktober 2026 — Satu output per konten

Mengganti daftar output dengan pilihan tunggal Feed atau Story sejak upload. Preview dan publikasi mengikuti pilihan tersebut; Story tidak menampilkan field caption/hashtag posting. Backend memvalidasi output callback dan publikasi; workflow n8n, Swagger dan regression tests mengikuti kontrak baru. Migration tambahan mengonversi job lama tanpa reset database. Verifikasi: 185 tes backend lulus, termasuk konversi data lama, rollback/reapply dan penolakan output callback yang salah. Typecheck, lint dan build lulus. Migration sudah diterapkan ke database aplikasi setelah backup, dan workflow baru sudah diaktifkan di n8n server. Uji nyata Feed dan Story berhasil mencapai READY_FOR_REVIEW dengan satu render masing-masing; tidak melakukan publikasi Instagram. Pengujian ulang terarah yang sebelumnya terhalang koneksi MySQL kini lulus (25 tes). Lihat [catatan penerapan](archive/audits/deployment-single-output-2026-10-21.md).

## 20 Oktober 2026 — Penataan dokumentasi

Memisahkan aturan, arsitektur, fitur, referensi, operasional backend, dan arsip audit. Indeks per kategori serta tautan silang diperbarui. Tidak mengubah runtime aplikasi.

## 20 Oktober 2026 — Audit menyeluruh

Refactor boundary API, repository, upload, Graph client, cache analytics, lifecycle worker dan frontend. Swagger dan regression tests diperbarui. Rincian dan hasil validasi tersimpan dalam [laporan audit](archive/audits/audit-2026-10-20.md).

## 20 Oktober 2026 — Baseline final dan pembersihan alur lama

Migration disusun ulang menjadi 13 file untuk 13 tabel (1792490400000–1792490400012), langsung memakai schema Review → Publish/Reject. Migration transisi dan tabel revisi tidak lagi disertakan. Setiap file memiliki up/down untuk satu tabel; dependency diuji melalui rollback dan reapply. Schema lokal dibandingkan dengan database test yang dibuat dari baseline sebelum ledger diselaraskan, setelah backup SQL privat; data aplikasi dipertahankan.

Alias URL editor, AI Jobs, Studio, dan Integration Settings beserta penanganan navigasinya dihapus. Teks UI serta import yang tidak dipakai dibersihkan. Formatter kini menormalkan struktur dengan ESLint sebelum Prettier agar perbaikan braces tidak meninggalkan indentasi yang rusak. Adapter n8n legacy tetap digunakan karena merupakan kontrak integrasi aktif, bukan sisa alur editor.

## 20 Oktober 2026 — Review langsung ke Publish atau Reject

Menghapus langkah simpan revisi. Detail menampilkan hasil dan keputusan; form Publish menyatukan caption, foto, akun dan waktu posting. Backend menerima konten final dalam request publish, menyimpan draft dan snapshot atomik, serta mempertahankan idempotency dan satu postingan per project. History database lama diarsipkan sebelum konsolidasi. Endpoint PATCH draft, entity revisi, nomor revisi dan UI editor lama dihapus. URL editor lama hanya alias menuju Publish.

Validasi: 160 tes backend dan 44 tes frontend lulus; typecheck, lint, dan build kedua project lulus. Lima migration telah diterapkan pada database development lokal setelah backup SQL privat. Pengujian visual browser terhalang saved origin permission; tidak ada publikasi nyata ke Instagram pada refactor ini.

## 2026-10-20 — Keterbacaan kode

## 20 Oktober 2026 — audit struktur lanjutan

Audit keterbacaan: pemilihan sumber publikasi dipisahkan ke `resolveSourceKey`; lock project/draft, idempotency dan cleanup snapshot tetap berada pada transaksi enqueue. Tidak mengubah kontrak API atau status publikasi.

- Merapikan source dan tests: jarak fungsi/method, blok import, indentasi, kondisi berkurung kurawal dan pemecahan object/parameter panjang.
- Menambahkan command format dan aturan lint untuk menjaga pola yang sama. Perubahan alur reporting/breadcrumb yang sudah ada tetap dipertahankan.

## 2026-10-20 — Seluruh periode pada reporting

Overview, daftar Content dan count status tidak lagi memakai batas default 30 hari. Parameter days tetap opsional untuk filter eksplisit; pagination tetap berlaku.

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
- Verified real upload → dispatch → AI → MinIO renders → revision → internal approval, duplicate result handling and webhook validation. See [verification report](archive/audits/audit-n8n-2026-10-18.md).


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
- Setup, tradeoffs and live integration limits: docs/operations/setup.md and docs/features/content-automation.md.

## 2026-10-16 — Social module refactor

Split social controllers/services/validators/entities into batch, media, job, workflow, draft, settings and reporting. Shared transactional repository and ownership context preserve atomic operations. Composition root supports test adapters. API/schema unchanged. See [refactor notes](archive/audits/refactor-2026-10-16.md).

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

Baseline migration/database direset atas instruksi pengguna. Runtime tidak lagi memakai nama social; config dan terjemahan dipisah per fitur, dispatcher menjadi jobs:dispatch. Form contact berbagi fields/validasi dan tidak lagi tertutup saat klik di dalam modal. Lihat backend/docs/archive/audits/audit-baseline-2026-10-16.md untuk detail dan batas verifikasi.

## 2026-10-16 — Dispatcher dan notifikasi

Kontrol dispatcher dashboard dipertahankan sesuai pilihan pengguna. Status statis/deployment yang tidak diperlukan dihapus; readiness divalidasi saat toggle dan worker tick. Upload mengikuti batas backend melalui /batches/limits. UAlert frontend dihapus; toast menjadi notifikasi utama, dengan teks untuk status kontekstual. Lihat backend/docs/archive/audits/audit-dispatcher-2026-10-16.md.

## 2026-10-18 — Audit config dan env

Hapus API_KEY dan middleware yang tidak pernah digunakan, termasuk persyaratan startup production yang tidak relevan. JWT dan n8n service authentication dipertahankan. Template/local env diperiksa berdasarkan consumer runtime, test, dan deployment; lihat AUDIT-CONFIG-2026-10-18.md.

## 2026-10-18 — MinIO presigned media

n8n preview URLs now reuse MinIO presigning. Removed MEDIA_SIGNING_SECRET and the custom media-access route; manifest/render validation and dispatcher readiness were updated. See backend/docs/archive/audits/audit-presigned-media-2026-10-18.md.

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

## 21 Oktober 2026 — Redis Analytics

Cache Analytics dipindahkan dari memori proses ke Redis dengan TTL lima menit, lock antar-instance, fallback saat Redis gagal dan proteksi terhadap penulisan oleh pemilik lock kedaluwarsa. Kontrak API/frontend tetap. Environment Redis disimpan privat; pengujian mencakup cache hit, expiry, concurrency dan kegagalan provider/cache.

## 21 Oktober 2026 — Pemulihan callback dan analisis foto

Tunnel callback n8n lokal dipulihkan setelah port server 14000 tidak memiliki listener dan Claim Job mendapat 502. Analisis foto dibagi maksimal empat per request karena gateway mengembalikan respons kosong untuk upload 13 foto. Hasil digabung dan tetap wajib mencakup semua aset unik; respons kosong/tidak final ditolak dengan pesan yang jelas.

Verifikasi live: callback kembali terhubung dan Claim Job berhasil. Execution 21 memakai analisis bertahap: tiga dari empat respons berhasil, satu tetap kosong (in_progress, usage 0), sehingga job ditandai FAILED dengan benar. Belum ada hasil READY_FOR_REVIEW untuk upload ini; perbaikan gateway AI masih diperlukan. Suite 191 tes, typecheck, lint dan build lulus.

## 21 Oktober 2026 — Analisis per foto

Gateway tetap gagal untuk kelompok foto tertentu, tetapi setiap fotonya berhasil saat diuji sendiri. Workflow kini mengirim satu foto per request dengan jeda pengiriman tiga detik, lalu memvalidasi cakupan seluruh aset dan mengurutkan kandidat berdasarkan skor. Tidak melewati foto gagal atau mengubah respons kosong menjadi sukses.

Verifikasi end-to-end setelah deployment: execution 23 berhasil mengembalikan job af786323-da1f-4ff8-bd52-4bc8030ed797 ke READY_FOR_REVIEW. Seluruh 13 foto dianalisis, lima kandidat dipilih dan satu render Feed dibuat. Tidak ada posting Instagram yang dikirim. Suite 191 tes, lint, typecheck dan build lulus.

## 21 Oktober 2026 — Pengeditan gambar oleh AI

- Gaya desain pada upload menjadi prompt n8n untuk model gambar Codex, bukan komposisi SVG backend.
- Gateway image adapter memakai model pengarah yang didukung; konfigurasi/patch terdokumentasi dalam runbook.
- Callback menerima satu gambar base64, memvalidasi raster dan menyimpan JPEG ke MinIO. SVG lama tetap terbaca, tetapi bukan kontrak callback baru.
- Hapus renderer template, endpoint design-preview dan preview otomatis per ketikan. Caption/hashtag tetap dapat diubah tanpa membatalkan desain; metadata visual dilindungi dari ketidaksesuaian.
- Pengujian tidak memublikasikan postingan ke Instagram.

Verifikasi live 21 Oktober: execution 27 (Feed) dan 28 (Story) sukses. Dua foto per job dianalisis, hasil edit gambar AI dikirim lewat callback dan disimpan sebagai JPEG 1080×1350 / 1080×1920 dengan state AI_IMAGE. Keduanya READY_FOR_REVIEW; endpoint detail/gambar terautentikasi mengembalikan HTTP 200. Tidak ada posting Instagram dikirim. Backend 193 tes dan frontend 52 tes lulus; lint, typecheck dan build lulus. Pemeriksaan visual dilakukan pada gambar hasil workflow; browser UI tidak diuji ulang karena izin localhost masih diblokir pada sesi sebelumnya.

## 21 Oktober 2026 — Konsolidasi migration desain AI

Atas permintaan reset baseline development, template_id digabung ke CreateBatches; migration ALTER tambahan dihapus. Kembali menjadi 13 migration untuk 13 tabel dengan synchronize false. Database lokal dibackup, schema dibandingkan dengan baseline pada database disposable, kemudian satu entry ledger tambahan dihapus tanpa mengubah data aplikasi atau media. Tes mencakup pembuatan database kosong, down/up seluruh baseline dan default template.

## 21 Oktober 2026 — Referensi visual poster AMTI

Desain memakai contoh visual dan logo AMTI asli dari bucket MinIO yang sama, terpisah dari foto proyek. Prompt mengikuti fotografi penuh, tipografi condensed italic putih/kuning dan kolase diagonal. Headline dipersingkat; contoh tidak menjadi sumber fakta/foto proyek. Ditambahkan command brand:upload untuk provisioning dua PNG pada lingkungan baru dan URL presigned referensi di manifest n8n.

Verifikasi: execution 29 sukses untuk job d0687511-67dd-4afe-9909-6fedd0f6c10b. Empat foto proyek dianalisis dan diedit dengan dua referensi visual terpisah; hasil JPEG Feed 1080×1350 tersimpan di MinIO dan READY_FOR_REVIEW. Pemeriksaan visual mengonfirmasi kolase diagonal, headline putih/kuning, logo dan fotografi penuh. Backend 194 tes, lint, typecheck dan build lulus. Pengujian ini tidak mengirim postingan ke Instagram.

## 21 Oktober 2026 — Logo resmi dan ikon footer

Referensi gambar memakai logo horizontal AMTI beserta tagline dan logo Graha Survei Indonesia yang diberikan pengguna. Keduanya disimpan di MinIO dan dikirim terpisah dari foto proyek. Footer sekarang meminta ikon website, Instagram, WhatsApp dan LinkedIn dengan label dari contoh AMTI pengguna. Header menampilkan partner kiri dan AMTI kanan. Command brand:upload menerima PNG referensi, PNG AMTI dan JPEG partner.

Verifikasi live: execution 31 sukses untuk job cecb8d67-4b47-4d3e-a9fa-1e802f8a5b95, READY_FOR_REVIEW dengan JPEG AI_IMAGE 1080×1350. Pemeriksaan visual mengonfirmasi kedua logo beserta tagline dan empat ikon footer (website, Instagram, WhatsApp, LinkedIn). Backend 194 tes lulus, lint/typecheck/build lulus. Tidak ada posting Instagram dikirim.

## 21 Oktober 2026 — Layout logo sudut dan footer satu baris

Mengganti referensi visual dengan contoh terbaru pengguna. Panel logo menempel pada tepi kiri/kanan, menyisakan ruang tengah; footer berupa pita putih tipis satu baris dengan empat ikon dan data kontak AMTI. Menghapus instruksi footer dua baris. Workflow n8n diperbarui dan execution 32 sukses: job 4db21f5c-6bf3-4fdc-8122-c776697f2554 READY_FOR_REVIEW, JPEG 1080×1350. Hasil gambar diperiksa langsung: panel sudut dan footer satu baris tampil. Backend 194 tes, typecheck, lint dan build lulus. Tidak dipublikasikan ke Instagram.

## 21 Oktober 2026 — Carousel Feed

Feed mendukung upload 19 foto, edit AI untuk setiap foto, pemilihan maksimal 10 slide dan urutan eksplisit. UI pilihan foto utama diganti pilihan hasil edit dan drag reorder; Story tetap satu gambar. Publishing menyimpan snapshot media berurutan dan progress child container; langsung/jadwal menggunakan satu parent carousel. Kontrak API dan workflow n8n diperbarui.

Verifikasi carousel: 197 tes backend dan 53 tes frontend lulus, typecheck/lint/build lulus. Execution n8n 33 menghasilkan dua render AI dan job 5c344a10-00d3-4a40-a47f-396edafca548 READY_FOR_REVIEW. Meta menerima dua child container dan parent carousel sampai FINISHED pada akun beta_dev12; tidak ada media_publish dipanggil. Migration aditif sudah diterapkan setelah backup. Pengujian browser terhalang izin localhost; pengujian UI interaktif belum dilakukan.
