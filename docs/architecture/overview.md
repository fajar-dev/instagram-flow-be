# Arsitektur backend IG Flow

Frontend Nuxt mengakses API Hono dengan JWT. API menyimpan state di MySQL, media di MinIO, dan cache Analytics sementara di Redis. Worker outbox mengirim event ke n8n; n8n menghubungi gateway AI berformat OpenAI dan mengembalikan hasil melalui callback service-authenticated.

## Batas tanggung jawab

| Modul | Tanggung jawab |
| --- | --- |
| `auth` | Login, Google, refresh, profil, password dan reset token |
| `user` | CRUD pengguna aktif/nonaktif dan serialisasi avatar |
| `storage` | Upload objek umum melalui helper MinIO |
| `content` | Batch dan child `media`: upload, validasi, thumbnail, preview, render |
| `ai-job` | Job, retry, dispatch; child `workflow`: claim, manifest, result, failure dan adapter n8n |
| `content-review` | Draft konten dan keputusan Reject |
| `integration` | Sakelar dispatcher dan pemeriksaan konfigurasi aman |
| `reporting` | List, counts, overview, audit log dan serializer reporting |
| `instagram` | Credential JSON privat, Graph client tervalidasi dan child analytics/cache |
| `publishing` | Snapshot final, jadwal dan worker publikasi Instagram |
| `shared` | Konteks, validator dan repository transaksi lintas fitur konten |

Tidak ada modul payung social. `*.module.ts` merupakan composition root: file ini menyusun dependency dan mengekspor controller/service yang dipakai route atau command. Workflow adalah child dari ai-job, bukan layanan aplikasi yang berdiri sendiri.

## Layer

Controller menerima input tervalidasi, memanggil service, lalu serializer/ApiResponse. Service menjalankan aturan bisnis melalui interface repository atau adapter I/O. Repository mengakses TypeORM dan mengelola transaksi/lock. Jangan membuka koneksi database atau memanggil ORM dari service/controller.

Repository workflow bersama saat ini melayani transaksi beberapa entitas konten; itu bukan alasan membuat duplikasi repository atau menyatukan seluruh fitur ke satu service. Referensi CRUD konkret: `src/modules/user/`. Referensi alur lintas entitas: `src/modules/ai-job/job.service.ts` dan `src/modules/content-review/draft.service.ts`.

## Proses konten

Batch dibuat, foto dikirim satu per request, lalu process mengunci batch dan membuat job/outbox secara atomik. Dispatcher menyampaikan event. n8n mengklaim job memakai event/execution ID, mengambil manifest berisi preview presigned, menganalisis seluruh foto dan membuat caption/render yang diminta. Backend memvalidasi hasil, menyaring SVG, dan menyimpan hasil/draft serta metadata render.

Review langsung menuju Publish atau Reject. Publish mengirim konten final dan expectedContentHash, lalu menyimpan draft final serta snapshot publikasi dalam transaksi yang sama. Reject menggunakan contentHash. Tidak ada endpoint edit terpisah atau riwayat revisi aktif. Idempotency, claim dan transaksi melindungi request ganda; lihat [kontrak API](../reference/api.md).

## Media dan akses

Seluruh pengguna aktif terautentikasi memiliki akses aplikasi yang sama. Uploader/reviewer ID tetap disimpan sebagai jejak aktivitas. Callback n8n memakai service token terpisah, bukan JWT pengguna.

Satu bucket privat digunakan untuk avatar dan konten. MySQL hanya menyimpan metadata/key media. SVG disanitasi, foto dipasangkan dengan aset yang diketahui dari MinIO, dan frontend menampilkan SVG sebagai image, bukan markup HTML. Tidak ada fallback media lokal.

## Entry point dan operasi

`src/app.ts` menyusun Hono, middleware, CORS, routes dan error handler yang juga digunakan suite API. `src/index.ts` hanya startup database dan ekspor server. Semua endpoint didaftarkan melalui `src/routes/api.ts`. Worker berada di `src/commands/job-dispatch.ts`; migration/seeder adalah CLI terpisah. `/health` memeriksa apakah DataSource terinisialisasi, bukan probe penuh SMTP/MinIO/n8n.

## Instagram publishing

Modul instagram membaca JSON credential dan menyediakan adapter Graph API; modul publishing memiliki entity publications, repository transaksi, snapshot media, service, controller dan worker. Keduanya berada di top-level sesuai fitur. Aksi Publish langsung membuat antrean dari READY_FOR_REVIEW. Worker `posts:dispatch` tidak bergantung pada webhook n8n. Lihat [publishing](../features/instagram-publishing.md).

Worker CLI berbagi lifecycle pada `src/commands/run-worker.ts`, termasuk signal shutdown, cleanup koneksi dan opsi `--once`. Repository User dan Reset Token mengambil repository TypeORM saat operasi, sehingga pergantian DataSource test tidak meninggalkan manager lama. Avatar dan Content berbagi decoder `src/core/helpers/upload-image.ts`; semua upload memakai bucket privat.
