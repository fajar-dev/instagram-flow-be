# IG Flow — Aturan proyek backend

Backend IG Flow menyediakan API dan worker konten AMTI. Baca [panduan kontribusi](docs/rules/agent-workflow.md) dan [arsitektur](docs/architecture/overview.md) sebelum perubahan implementasi. AGENTS.md dan CLAUDE.md harus tetap identik.

## Stack dan sumber acuan

Bun, Hono, TypeORM/MySQL (mysql2), Zod, JWT hono/jwt, Nodemailer, MinIO dan Sharp. AI dijalankan oleh n8n melalui gateway OpenAI-compatible. Versi dependency mengikuti package.json dan bun.lock. Referensi CRUD aktif adalah src/modules/user; referensi autentikasi adalah src/modules/auth.

## Arsitektur wajib

- Controller → Service → Repository melalui interface. Query/TypeORM dan transaksi berada di repository; jangan import AppDataSource ke service.
- Wiring dependency berada di *.module.ts. Jangan instantiate service/repository di controller.
- Semua endpoint berada di src/routes/api.ts; app.ts memasang middleware/error handling; index.ts menangani startup.
- Environment hanya dibaca parser src/config/config.ts untuk runtime aplikasi.
- Body JSON memakai Zod dan c.req.valid; query memakai validator bersama. Gunakan exception aplikasi, ApiResponse dan serializer, bukan response ad hoc atau entity sensitif mentah.
- Gunakan logger; jangan mencetak credential, password, reset token atau signed URL. Pesan source English, terjemahan en/id di src/core/i18n.
- Modul per fitur; media adalah child content, workflow child ai-job. Jangan membuat modul payung social. Modul tanpa persistence tidak membutuhkan entity/migration kosong.

## Aturan produk

Semua pengguna aktif terautentikasi memiliki akses sama. Jangan menambah role/ownership permission. User/uploader/reviewer ID tetap metadata audit. JWT dan service token callback n8n tetap wajib.

Semua media persisten memakai satu bucket MinIO, termasuk avatar, original, preview, thumbnail dan render. Tidak ada fallback lokal, SVG inline di database, proxy URL umum, atau secret signing tambahan. Presigned URL menggunakan MinIO.

Alur konten adalah READY_FOR_REVIEW → PUBLISH atau REJECTED. PUBLISH adalah tahap publikasi, bukan bukti post sudah tayang; status delivery ada pada publication. Settings mempertahankan kontrol dispatcher; credential Instagram di JSON privat; credential integrasi lainnya tetap di environment. Pertahankan idempotency, claim ownership, hash konten dan penguncian keputusan publish/reject.

Reset password memakai tabel terpisah; request/resend membuat token baru. Satu reset berhasil menghapus semua token user dalam transaksi. Auth Google harus dipertahankan.

## Database dan command

Sync selalu false, termasuk test. Migration aktif: 13 create-table baseline, satu tabel per file, langsung ke schema final. Carousel child_container_ids sudah berada di migration publications; tidak ada migration transisi atau kolom template_id, primary_asset_id dan media_key. Snapshot memakai urutan renderIds dan mediaKeys. Perubahan berikutnya memakai migration baru kecuali reset development diminta eksplisit. Baca docs/operations/database.md sebelum mengubah schema.

Seeder satu file per seeder pada src/database/seeders; index.ts hanya koordinator, import.meta.main menjaga entrypoint CLI. Migration dan seeder memakai script package, bukan job. Worker AI menjalankan dispatch/recovery konten; worker publishing menangani publikasi Instagram.

## Kontribusi dan verifikasi

Gunakan kebab-case file, PascalCase class/interface, camelCase TS/JSON, snake_case tabel/kolom. Pertahankan gaya file yang diedit. Null mengosongkan nilai nullable; undefined tidak mengubah field. Jangan menelan error atau mengembalikan sukses sebelum I/O yang diperlukan selesai.

Untuk perubahan implementasi jalankan bun run typecheck, bun run test, bun run build. Database test harus terpisah dan disposable. Tambahkan regresi yang menguji perilaku berubah; dokumentasi-only cukup validasi fakta/link. Perbarui OpenAPI untuk kontrak API dan changelog untuk perubahan berarti. Laporkan batas pengujian eksternal.

Audit bertanggal dan PRD awal adalah arsip, bukan aturan aktif. Jangan mengambil role/menu/storage lama dari arsip. Jangan commit .env, credential export, foto pengguna atau rahasia. Perubahan deployment tidak termasuk otomatis dalam tugas dokumentasi.

## Instagram publishing — 19 Oktober 2026

Publikasi Graph API memakai Instagram Login (graph.instagram.com, Instagram User access token, tanpa Facebook Page) melalui aksi eksplisit mendukung daftar multi-account, tetapi satu project hanya boleh diposting satu kali ke satu akun, langsung/terjadwal. Credential hanya di JSON privat server (bukan database); contoh tanpa secret boleh di-commit. Ready for review hanya mempunyai keputusan Publish atau Reject. Snapshot dan jadwal berada di tabel publications dengan constraint unique batch_id sejak baseline. Worker posts:dispatch terpisah dari jobs:dispatch. Settings menampilkan daftar akun dan kontrol dispatcher AI. Jangan mengulang publish saat hasil jaringan ambigu; lakukan rekonsiliasi container.

## Keterbacaan dan format

Jalankan `bun run format` untuk merapikan source dan `bun run lint` untuk memeriksa aturan. Pisahkan fungsi/method dan blok import dari deklarasi berikutnya dengan satu baris kosong. Gunakan kurung kurawal pada kondisi/loop dan satu statement per baris; jangan memadatkan beberapa operasi dalam satu baris. Formatter memecah object, argumen dan ekspresi panjang tanpa mengubah kontrak bisnis.
Backend memakai indentasi 4 spasi, double quote, tanpa semicolon dan tanpa trailing comma, mengikuti UserService. Workflow JSON n8n dibangun ulang dari source setelah format; ini tidak melakukan deploy.

## Penyederhanaan publish — 20 Oktober 2026

Draft menyimpan isi konten langsung. Tidak ada entity, endpoint edit, nomor, atau tabel revisi aktif. Publish menyimpan konten final dan snapshot publikasi secara atomik; Reject mengakhiri konten. Baseline development sudah disusun ulang langsung ke schema final, satu tabel satu file. Tidak ada migration transisi atau tabel revisi. Backup dan verifikasi schema wajib sebelum menyelaraskan ledger database development yang sudah berisi data.

## Output tunggal — 21 Oktober 2026

Setiap job memilih satu `output`: `feed` atau `story` sejak proses upload. Output tidak dapat diganti saat publish. Event n8n memakai scalar `output`; callback Feed berisi satu render AI per foto upload (maksimal 19), sedangkan Story tetap satu render. Publikasi Feed memilih 1–10 render unik dalam urutan eksplisit; Story tepat satu. Feed memuat caption/hashtag; Story tidak memiliki caption/hashtag posting (payload kosong). Jangan mengembalikan checkbox multi-output, tab pemilih preview, atau pilihan placement pada form publish.

## Kontrak workflow aktif

Integrasi n8n hanya memakai camelCase. Tidak ada adapter snake_case, N8N_CONTRACT, pilihan template, fallback foto mentah/SVG atau snapshot publikasi satu mediaKey. Desain memakai referensi AMTI tetap. Daftar dan statistik job hanya memakai attempt terbaru; retry attempt yang sudah digantikan ditolak.
