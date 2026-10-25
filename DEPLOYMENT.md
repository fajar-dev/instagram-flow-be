# Deployment IG Flow — panduan DevOps

Panduan pemasangan server baru dan pemindahan deployment. **API memakai PM2; worker AI dan publishing memakai Supervisor; frontend SPA dilayani nginx; n8n memakai Docker Compose.** Semua domain, path, user, password dan versi di contoh harus disesuaikan. Tidak memerlukan tunnel MacBook.

## Daftar isi

- [1. Arsitektur dan urutan pemasangan](#1-arsitektur-dan-urutan-pemasangan)
- [2. Nilai yang harus disepakati](#2-nilai-yang-harus-disepakati)
- [3. Database, storage dan Redis](#3-database-storage-dan-redis)
- [4. Environment backend](#4-environment-backend)
- [5. Migration, build dan akun awal](#5-migration-build-dan-akun-awal)
- [6. Frontend dan OAuth](#6-frontend-dan-oauth)
- [7. API dengan PM2](#7-api-dengan-pm2)
- [8. Worker dengan Supervisor](#8-worker-dengan-supervisor)
- [9. n8n dengan Docker Compose](#9-n8n-dengan-docker-compose)
- [10. Nginx dan HTTPS](#10-nginx-dan-https)
- [11. Uji penerimaan sebelum handover](#11-uji-penerimaan-sebelum-handover)
- [12. Operasi, update dan rollback](#12-operasi-update-dan-rollback)
- [13. Troubleshooting](#13-troubleshooting)
- [14. Referensi dan batas cakupan](#14-referensi-dan-batas-cakupan)

## 1. Arsitektur dan urutan pemasangan

| Komponen | Fungsi | Pengelola |
| --- | --- | --- |
| Frontend Nuxt SPA | Dashboard dan callback popup Microsoft | nginx, build statis |
| Backend Bun/Hono | API, autentikasi, callback n8n | PM2, satu instance awal |
| Dispatcher AI | Outbox, retry dan watchdog job AI | Supervisor |
| Dispatcher publishing | Posting langsung, jadwal dan rekonsiliasi Instagram | Supervisor |
| MySQL | Data aplikasi, antrean dan jadwal | Layanan database |
| MinIO | Bucket privat untuk original, preview, render, avatar dan brand | Layanan object storage |
| Redis | Cache analytics 300 detik; bukan antrean | Layanan Redis |
| n8n | Analisis foto, caption dan editing gambar AI | Docker Compose |
| AI gateway | API analisis dan image editing | Layanan terpisah dari aplikasi |

Urutan: siapkan infrastruktur → database/storage/Redis → environment backend → migration/build → frontend/OAuth → API/nginx/TLS → n8n/gateway/workflow → worker → uji penerimaan. Jangan aktifkan worker publishing pada hasil restore sebelum antrean diperiksa.

## 2. Nilai yang harus disepakati

Contoh konsisten di dokumen ini:

| Pengaturan | Contoh |
| --- | --- |
| User deployment | `igflow` |
| Direktori backend/frontend | `/srv/ig-flow/backend`, `/srv/ig-flow/frontend` |
| Document root frontend | `/var/www/ig-flow` |
| Bun | `/home/igflow/.bun/bin/bun` |
| API internal | `127.0.0.1:8002` |
| Dashboard + API | `https://ig.example.com`, API prefix `/api` |
| n8n | `https://n8n.example.com`, internal `127.0.0.1:5678` |
| Storage S3 API | `https://media.example.com` |
| Direktori n8n | `/srv/ig-flow/n8n` |
| MySQL database | `ig_flow` |

Gunakan Linux dengan systemd (contoh perintah Ubuntu/Debian), nginx, Supervisor, Git, Node.js LTS dan PM2, Bun, Docker Engine + Compose plugin, MySQL kompatibel 8.4, Redis dan MinIO. Gunakan versi Bun yang telah diuji dengan lockfile (frontend mencatat Bun 1.3.1); pin versi image n8n/gateway dan catat versi runtime dalam handover. Jangan memakai tag `latest` untuk release yang sudah disetujui. Kebutuhan RAM/disk bergantung jumlah gambar, ukuran execution dan concurrency; ukur satu batch maksimum sebelum menetapkan kapasitas.

DNS A/AAAA harus menuju reverse proxy yang benar. Buka 80/443 serta SSH administratif terbatas. MySQL, Redis, port API, console MinIO, gateway dan port 5678 tidak perlu diekspos publik. Backend, n8n dan gateway harus dapat mengambil URL storage; Meta juga harus dapat mengambil URL media publikasi yang ditandatangani. Jika komponen terpisah server, ganti loopback dengan alamat jaringan privat dan atur firewall/TLS sesuai koneksinya.

Pasang runtime melalui prosedur organisasi; pastikan berikut tersedia:

```sh
bun --version
node --version
pm2 --version
docker compose version
nginx -v
supervisord --version
```

Buat user/direktori (sekali, sebagai administrator):

```sh
sudo adduser --disabled-password --gecos '' igflow
sudo install -d -o igflow -g igflow /srv/ig-flow
sudo install -d -o igflow -g igflow /var/www/ig-flow
sudo install -d -m 0750 /var/log/supervisor
```

Clone repository backend dan frontend ke direktori di atas dengan user `igflow`. Checkout commit/tag release yang berpasangan, bukan mengambil perubahan branch secara otomatis. Backend dan frontend adalah repository terpisah. Jalankan perintah Bun/PM2 sebagai `igflow`, dengan working directory sesuai bagian panduan.

## 3. Database, storage dan Redis

### MySQL

Provision MySQL sendiri atau gunakan layanan terkelola. Buat database kosong dan user aplikasi melalui sesi SQL administratif; ganti password contoh sebelum menjalankan:

```sql
CREATE DATABASE ig_flow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'igflow'@'localhost' IDENTIFIED BY 'REPLACE_WITH_PRIVATE_PASSWORD';
GRANT ALL PRIVILEGES ON ig_flow.* TO 'igflow'@'localhost';
```

Sesuaikan host user bila database berada di mesin berbeda. Jangan gunakan root database untuk aplikasi. Parser koneksi saat ini tidak menyediakan environment TLS MySQL; gunakan jaringan privat yang disetujui atau tambahkan dukungan TLS sebelum memakai layanan yang mewajibkannya. Waktu koneksi database UTC; tampilan aplikasi menggunakan Asia/Jakarta.

### MinIO

Provision satu bucket privat, contoh `ig-flow`, dan credential layanan yang dapat memeriksa/membuat bucket serta membaca, menulis dan menghapus objek sesuai adapter storage. Jangan memakai akses anonymous bucket. Endpoint yang dikonfigurasi backend harus berupa host S3 API yang dapat diakses browser, n8n/gateway dan Meta, bukan URL console MinIO. Contoh: host `media.example.com`, port `443`, SSL `true`.

TLS/reverse proxy storage harus mempertahankan Host, path dan query URL presigned; jangan mengganti hostname setelah signing. Pasang certificate valid dan sinkronkan jam server. Bila browser memerlukan CORS storage, izinkan origin dashboard dan metode yang diperlukan sesuai kebijakan storage. Semua media persisten berada di bucket ini; direktori lokal backend bukan tempat media.

Setelah environment backend siap, upload tiga aset brand resmi:

```sh
cd /srv/ig-flow/backend
bun run brand:upload /secure-assets/reference.png /secure-assets/amti-logo.png /secure-assets/partner-logo.jpeg
```

Referensi dan logo AMTI wajib PNG statis, logo partner wajib JPEG statis, masing-masing maksimal 8 MiB. Command tersebut menyiapkan referensi desain dan dua logo yang wajib untuk workflow editing AI. Jangan mengganti dengan gambar contoh proyek sintetis sebagai dokumentasi proyek asli.

### Redis

Provision Redis privat dengan password; isi environment berikut. Gunakan `REDIS_TLS=true` bila endpoint menyediakan TLS. Implementasi tidak menyediakan parameter username ACL, database index, Sentinel atau Cluster; siapkan endpoint standalone/compatible dengan default user yang sesuai. Redis menyimpan cache analytics, bukan credential atau jadwal. Jika Redis gagal, analytics mengambil langsung dari Meta; `/health` tidak menguji Redis. Jangan menjalankan FLUSHALL pada Redis bersama.

## 4. Environment backend

Dari `/srv/ig-flow/backend`, salin `.env.dist` ke `.env` hanya pada instalasi baru. Isi nilai di bawah, lalu `chmod 600 .env`. Jangan memasukkan secret ke Git, frontend, tiket atau output log. Buat JWT secret dan kedua service token secara independen, misalnya dengan `openssl rand -hex 32` di sesi privat.

```dotenv
NODE_ENV=production
APP_NAME=ig-flow
APP_HOSTNAME=127.0.0.1
PORT=8002
APP_URL=https://ig.example.com
FRONTEND_URL=https://ig.example.com
JWT_SECRET=REPLACE_WITH_UNIQUE_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_SECRET

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=igflow
DB_PASS=REPLACE_WITH_PRIVATE_PASSWORD
DB_NAME=ig_flow
DB_TEST_NAME=ig_flow_test

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=REPLACE
SMTP_PASS=REPLACE
SMTP_FROM="IG Flow <noreply@example.com>"

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://ig.example.com/auth/microsoft/callback

MINIO_ENDPOINT=media.example.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=REPLACE
MINIO_SECRET_KEY=REPLACE
MINIO_BUCKET=ig-flow
SIGNED_MEDIA_URL_TTL_SECONDS=3600
MAX_UPLOAD_MB=15
MAX_BATCH_FILES=19
MAX_FILES_PER_AI_JOB=19

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=REPLACE
REDIS_TLS=false

N8N_WEBHOOK_URL=https://n8n.example.com/webhook/ig-flow/process
N8N_WEBHOOK_AUTH_TOKEN=REPLACE_WITH_WEBHOOK_TOKEN
N8N_BACKEND_SERVICE_TOKEN=REPLACE_WITH_CALLBACK_TOKEN
N8N_WEBHOOK_TIMEOUT_MS=15000
OUTBOX_RETRY_MAX=5
OUTBOX_RETRY_BACKOFF_SECONDS=30
PROCESSING_TIMEOUT_SECONDS=7500
INSTAGRAM_CREDENTIALS_FILE=secrets/instagram-accounts.json
```

`APP_URL` dan `FRONTEND_URL` adalah origin, jangan tambahkan `/api` ke FRONTEND_URL. Parser production mewajibkan JWT secrets tetapi tidak menjamin semua integrasi telah terisi; DevOps tetap harus memverifikasinya. SMTP diperlukan untuk reset password. Environment angka harus integer positif. Watchdog minimum 7500 detik; timeout webhook 15 detik hanya menunggu acknowledgement, bukan selesainya AI. Penjelasan lengkap parser ada di [environment](docs/operations/environment.md).

### Credential Instagram

Buat direktori `secrets` bila belum ada, lalu `secrets/instagram-accounts.json` milik user `igflow`, mode 0600. Gunakan secrets/instagram-accounts.example.json sebagai acuan. Instagram Login memakai **accessToken** tanpa Facebook Page:

```json
{
  "graphVersion": "v24.0",
  "app": { "appId": "", "appSecret": "" },
  "accounts": [
    {
      "key": "main",
      "label": "Main account",
      "instagramUserId": "",
      "accessToken": "",
      "enabled": false,
      "tokenExpiresAt": null
    }
  ]
}
```

Gunakan token Instagram Login untuk akun Professional; Facebook Page tidak dipakai. Isi ID/token valid sebelum enabled=true. Periksa izin publish dan insights sesuai fitur, jenis akun untuk Story, masa berlaku token dan akses aplikasi Meta. App ID/secret bukan pengganti access token. Renewal/onboarding token belum otomatis. File dibaca ulang pada operasi; lakukan pergantian atomik. Jangan mengganti identitas akun pada key yang sudah digunakan antrean. Lihat [publishing](docs/features/instagram-publishing.md).

## 5. Migration, build dan akun awal

```sh
cd /srv/ig-flow/backend
bun install --frozen-lockfile
bun run migration:show
bun run migration:run
bun run build
```

Database baru menjalankan 14 baseline migration schema final, termasuk job_notifications; synchronize selalu false. Jangan menjalankan seed demo pada server publik. Startup API/worker tidak menjalankan migration otomatis. Database lama harus dipindah melalui backup/restore beserta ledger migration, bukan menjalankan CREATE TABLE baseline ulang. Lihat [database](docs/operations/database.md).

Buat akun awal melalui endpoint `POST /api/auth/register` dengan JSON name/email/password, dari sesi operator yang aman; gunakan password kuat, bukan seeder demo. Endpoint register saat ini terbuka dan tidak memiliki bootstrap sekali-pakai. Untuk aplikasi internal, tetapkan pembatasan akses register di reverse proxy sesuai kebijakan organisasi setelah onboarding. Semua pengguna aktif memiliki akses aplikasi yang sama; tidak ada role admin khusus. Login Google/Microsoft membutuhkan email pengguna yang sudah terdaftar dan aktif.

Jalankan typecheck/lint/test/build di CI sebelum release. Test database harus disposable, terpisah dan berakhiran `_test`; jangan menjalankan suite terhadap database operasional.

## 6. Frontend dan OAuth

Di `/srv/ig-flow/frontend`, buat `.env` dari `.env.example`:

```dotenv
API_BASE_URL=https://ig.example.com/api
GOOGLE_CLIENT_ID=REPLACE_PUBLIC_CLIENT_ID
MICROSOFT_CLIENT_ID=REPLACE_PUBLIC_CLIENT_ID
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://ig.example.com/auth/microsoft/callback
```

Kosongkan provider yang tidak digunakan. Tidak ada secret di frontend. Nilai frontend statis ditetapkan saat build; perubahan domain/OAuth membutuhkan rebuild, bukan hanya mengganti `.env` setelah deployment.

```sh
cd /srv/ig-flow/frontend
bun install --frozen-lockfile
bun run build
test -f .output/public/index.html
rsync -a --delete .output/public/ /var/www/ig-flow/
```

Pastikan tujuan rsync hanya berisi build aplikasi ini. Nuxt memakai `ssr:false`; nginx melayani `.output/public`, tidak perlu frontend worker/PM2. Fallback `index.html` wajib untuk deep link dan callback Microsoft. Periksa cache browser/service worker jika bundle lama masih muncul setelah release.

Google: daftarkan origin HTTPS dashboard pada OAuth client dan cocokkan client ID backend/frontend; atur redirect yang diperlukan flow provider sesuai registrasi. Microsoft Entra: callback **Web** tepat `https://ig.example.com/auth/microsoft/callback`, client ID/tenant sama pada kedua aplikasi; client secret hanya backend. Jangan daftarkan sebagai SPA untuk flow confidential-client ini. Hindari COOP `same-origin` yang memutus window.opener popup. Lihat [autentikasi](docs/features/authentication.md).

## 7. API dengan PM2

Sebagai user `igflow`, dari backend dan dengan Bun pada PATH:

```sh
cd /srv/ig-flow/backend
pm2 start dist/index.js --name instagram-flow-be --interpreter /home/igflow/.bun/bin/bun
pm2 save
pm2 startup
```

Jalankan perintah systemd yang dicetak `pm2 startup` sebagai administrator, lalu `pm2 save` lagi. Gunakan PM2 milik user yang sama, bukan daemon PM2 root. Working directory harus backend agar `.env`, swagger.yaml dan path credential terbaca. Jika proses sudah ada, gunakan restart, jangan start duplikat.

```sh
pm2 status
curl --fail http://127.0.0.1:8002/health
```

API membuka port secara eksplisit dengan Bun.serve. PM2 online belum cukup: health harus 200 dengan database connected. `/` backend bukan frontend; dokumentasi API ada di `/api/docs`.

## 8. Worker dengan Supervisor

Install Supervisor melalui package manager dan buat `/etc/supervisor/conf.d/instagram-flow.conf`. Tidak ada program API di file ini. Sesuaikan path Bun jika instalasinya berbeda:

```ini
; Install as /etc/supervisor/conf.d/instagram-flow.conf
; Secrets and NODE_ENV are loaded by Bun from the application directory .env.
; API stays in PM2; stop only matching worker processes before enabling this configuration.

[program:instagram-flow-jobs]
directory=/srv/ig-flow/backend
command=/home/igflow/.bun/bin/bun src/commands/job-dispatch.ts
user=igflow
numprocs=1
autostart=true
autorestart=true
startsecs=5
startretries=3
stopsignal=TERM
stopwaitsecs=600
stopasgroup=true
killasgroup=true
priority=20
umask=027
environment=PORT="8002",APP_HOSTNAME="0.0.0.0"
redirect_stderr=true
stdout_logfile=/var/log/supervisor/instagram-flow-jobs.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5

[program:instagram-flow-publishing]
directory=/srv/ig-flow/backend
command=/home/igflow/.bun/bin/bun src/commands/publication-dispatch.ts
user=igflow
numprocs=1
autostart=true
autorestart=true
startsecs=5
startretries=3
stopsignal=TERM
stopwaitsecs=600
stopasgroup=true
killasgroup=true
priority=30
umask=027
environment=PORT="8002",APP_HOSTNAME="0.0.0.0"
redirect_stderr=true
stdout_logfile=/var/log/supervisor/instagram-flow-publishing.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5

[group:instagram-flow]
programs=instagram-flow-jobs,instagram-flow-publishing
priority=999
```

Bun membaca `.env` dari working directory, termasuk NODE_ENV. Contoh environment PORT tidak mengubah port layanan publik worker karena worker tidak membuka HTTP. Pastikan user dapat membaca source/dependency/.env/JSON privat.

Aktifkan setelah n8n dan credential siap:

```sh
sudo systemctl enable --now supervisor
sudo supervisorctl reread
sudo supervisorctl update instagram-flow
sudo supervisorctl status 'instagram-flow:*'
```

Autostart akan memproses antrean yang tersedia, termasuk publikasi terjadwal. Hentikan worker duplikat di PM2/terminal terlebih dahulu, tetapi **jangan hapus API dari PM2**. Sakelar Settings hanya mengendalikan dispatch AI; tidak menghentikan publishing. Stop publishing dengan `sudo supervisorctl stop instagram-flow:instagram-flow-publishing` ketika perlu menahan pengiriman.

## 9. n8n dengan Docker Compose

### 9.1 Provision instance

Buat `/srv/ig-flow/n8n` dan `.env` privat untuk Compose. Ini berbeda dari `.env` backend. Pilih versi n8n yang sudah diuji dengan workflow, lalu pin tag/digest; jangan menyalin versi gateway sebagai versi n8n.

```dotenv
N8N_IMAGE=docker.n8n.io/n8nio/n8n:REPLACE_WITH_TESTED_VERSION
N8N_ENCRYPTION_KEY=REPLACE_WITH_LONG_RANDOM_KEY
```

Simpan sebagai `.env`, chmod 600. Encryption key harus tetap sama saat restart/migrasi/restore agar credential lama dapat didekripsi. Compose minimal untuk satu instance kecil, dengan database internal n8n di volume persisten:

```yaml
services:
  n8n:
    image: ${N8N_IMAGE:?Set a tested n8n image}
    container_name: ig-flow-n8n
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      N8N_HOST: n8n.example.com
      N8N_PORT: "5678"
      N8N_PROTOCOL: https
      N8N_EDITOR_BASE_URL: https://n8n.example.com/
      WEBHOOK_URL: https://n8n.example.com/
      N8N_PROXY_HOPS: "1"
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY:?Set encryption key}
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true"
      GENERIC_TIMEZONE: Asia/Jakarta
      TZ: Asia/Jakarta
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: "168"
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

Simpan sebagai `compose.yaml` lalu:

```sh
cd /srv/ig-flow/n8n
docker compose config --quiet
docker compose up -d
docker compose ps
```

Konfigurasi ini bukan cluster/queue-mode. Untuk volume dan concurrency besar, provision database n8n/Postgres dan task runner sesuai versi n8n sebelum rollout. Database n8n terpisah dari MySQL aplikasi. Pastikan kebijakan runner versi yang dipilih mendukung Code nodes workflow; jangan mengaktifkan external module sembarang sebagai workaround.

`WEBHOOK_URL` dipakai versi lama; pada n8n >=2.35 gunakan `N8N_WEBHOOK_URL` sebagai penggantinya sesuai dokumentasi versi terpasang. **Nilai n8n adalah origin `https://n8n.example.com/`; nilai N8N_WEBHOOK_URL backend adalah endpoint lengkap `/webhook/ig-flow/process`.** Jangan memakai satu env file untuk kedua layanan. N8N_PROXY_HOPS harus sesuai jumlah reverse proxy terpercaya; contoh satu nginx. Tambahkan hop bila benar-benar ada load balancer/CDN di depannya. [Referensi proxy n8n](https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/).

Setelah HTTPS aktif, buka UI n8n, buat owner dengan credential privat, dan batasi akses editor sesuai kebijakan. Volume menyimpan workflow dan credential terenkripsi. Execution dapat memuat foto/base64; atur retensi dan kapasitas disk. Contoh retensi 168 jam harus disesuaikan kebutuhan tim.

### 9.2 Gateway dan model AI

Gateway AI **tidak disediakan** oleh Compose n8n atau backend. Provision endpoint OpenAI-compatible yang dapat dijangkau container n8n. Jangan gunakan localhost gateway dari container karena itu menunjuk container sendiri. Pilih HTTPS atau jaringan privat tepercaya; API key disimpan di credential n8n.

Workflow saat ini dibangun dengan konfigurasi khusus server lama di `integrations/n8n/build-workflow.ts`, node `Configuration`. Ubah source tersebut untuk environment baru, bukan hanya JSON hasil build:

| Field | Yang diisi |
| --- | --- |
| backendUrl | `https://n8n.example.com/ig-flow-api` tanpa `/api` tambahan |
| aiUrl | URL gateway lengkap, contoh `https://ai.example.com/v1/chat/completions` |
| model | Model vision/analisis yang didukung gateway; source saat ini `cx/gpt-5.6-luna` |
| imageUrl | URL gateway image generation/editing, contoh `https://ai.example.com/v1/images/generations` |
| imageModel | Model image yang mendukung reference inputs; source saat ini `cx/gpt-image-2` |

Ini bukan environment yang otomatis dibaca backend. Rebuild workflow setelah mengganti Configuration. Model text biasa tidak cukup untuk editing gambar. Adapter image gateway harus menerima JSON reference images dan mengembalikan gambar/base64 sesuai parser workflow. Uji kompatibilitas payload pada versi gateway yang dipilih sebelum publish workflow.

Integrasi sebelumnya memakai adapter 9router yang membutuhkan patch orchestration model. Script `integrations/n8n/deployment/patch-codex-image-model.mjs` khusus build adapter yang cocok, bukan patch universal. Jangan menerapkannya membabi buta pada gateway baru. Catat image/digest, patch dan model yang benar-benar lolos uji. Rincian kontrak ada di [n8n runbook](docs/operations/n8n.md).

### 9.3 Credential n8n

Buat tiga credential **Header Auth** di UI n8n, header name semuanya `Authorization`:

| Nama / ID referensi workflow | Header value | Harus sama dengan |
| --- | --- | --- |
| IG Flow Webhook / igFlowWebhookAuth | `Bearer <webhook-token>` | Backend N8N_WEBHOOK_AUTH_TOKEN |
| IG Flow Backend / igFlowBackendAuth | `Bearer <callback-token>` | Backend N8N_BACKEND_SERVICE_TOKEN |
| IG Flow AI Gateway / igFlowAiGateway | `Bearer <gateway-api-key>` | Gateway AI |

Credential baru biasanya memperoleh ID berbeda. Setelah import, pilih ulang credential pada node yang bersangkutan dan simpan/publish: Webhook memakai Webhook Auth; claim/manifest/callback memakai Backend Auth; Analyze Photos/Edit Image memakai AI Gateway. Jangan mengirim credential backend saat download URL presigned storage. Jika memakai import credential administratif dengan ID tetap, lakukan melalui file privat sementara dan hapus setelah sukses; jangan commit export plaintext.

### 9.4 Build, import dan publish workflow

```sh
cd /srv/ig-flow/backend
bun run integrations/n8n/build-workflow.ts
```

Hasilnya `integrations/n8n/ig-flow.workflow.json`. Import file ini melalui UI n8n, cek Configuration, pilih ulang credential, lalu **Publish/Activate sesuai versi n8n**. Untuk server baru, UI lebih mudah memastikan credential sudah terhubung. CLI alternatif setelah credential siap:

```sh
docker cp integrations/n8n/ig-flow.workflow.json ig-flow-n8n:/tmp/ig-flow.workflow.json
docker exec -u node ig-flow-n8n n8n import:workflow --input=/tmp/ig-flow.workflow.json
docker exec -u node ig-flow-n8n n8n publish:workflow --id=igFlowContentV3
```

Perintah publish bergantung versi n8n; gunakan UI bila versi tidak menyediakan CLI tersebut. Setelah publish lewat CLI, restart service n8n pada waktu tanpa execution aktif agar webhook terdaftar:

```sh
cd /srv/ig-flow/n8n
docker compose restart n8n
```

Untuk update workflow, backup dahulu, tunggu execution selesai, unpublish versi lama, import, hubungkan credential dan publish lagi. Pastikan execution berikut memakai versi baru. Jangan restart workflow aktif hanya untuk mengganti konfigurasi.

Gunakan URL production `/webhook/ig-flow/process`, bukan `/webhook-test/`. Webhook mengembalikan 202 sebelum AI selesai. Flow: claim → manifest → download media/reference → analisis → caption → edit setiap foto → callback result → READY_FOR_REVIEW. Failure callback memberi status gagal dan n8n menandai execution error. n8n tidak mempublikasikan ke Instagram.

Timeout image request 5 menit, workflow 2 jam dan watchdog minimum 7500 detik. Body callback maksimum 64 MiB. Signed URLs yang diperlukan workflow berumur setidaknya durasi proses yang diatur kode. Jangan menurunkan timeout tanpa menguji batch besar; concurrency editing source saat ini dua request per batch.

## 10. Nginx dan HTTPS

Siapkan certificate valid untuk kedua domain dengan mekanisme ACME organisasi. Untuk pemasangan awal, buat server HTTP sementara yang melayani challenge pada `/.well-known/acme-challenge/`; setelah certificate terbit, pasang konfigurasi HTTPS di bawah. Jangan menjalankan nginx dengan path certificate yang belum ada. Atur renewal otomatis dan uji renewal melalui client ACME yang digunakan.

Contoh `/etc/nginx/sites-available/ig-flow.conf` (ganti path certificate sesuai provisioner):

```nginx
server {
    listen 80;
    server_name ig.example.com n8n.example.com;
    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl;
    server_name ig.example.com;
    ssl_certificate /etc/letsencrypt/live/ig.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ig.example.com/privkey.pem;
    root /var/www/ig-flow;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location = /health {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 64m;
        proxy_read_timeout 120s;
    }
}
server {
    listen 443 ssl;
    server_name n8n.example.com;
    ssl_certificate /etc/letsencrypt/live/n8n.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.example.com/privkey.pem;
    location ~ ^/ig-flow-api(/api/jobs/[0-9a-fA-F-]+/(claim|manifest|result|failure))$ {
        rewrite ^/ig-flow-api(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 64m;
    }
    location /ig-flow-api/ { return 404; }
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 64m;
    }
}
```

Aktifkan site melalui symlink di sites-enabled bila distribusi memakai layout tersebut, hindari server_name/location duplikat. Pertahankan hardening TLS organisasi. Backend proxy_pass tidak memakai trailing slash agar prefix `/api` tetap utuh. Tidak perlu endpoint terpisah untuk setiap fitur karena seluruh route API di bawah prefix itu. Body limit backend tetap berlaku meskipun limit nginx 64 MiB. MinIO membutuhkan virtual host S3 tersendiri sesuai instalasinya, bukan location di `/api`.

```sh
sudo nginx -t
sudo systemctl reload nginx
```

## 11. Uji penerimaan sebelum handover

1. PM2 API online, dua worker Supervisor RUNNING, n8n container sehat dan semua process manager enabled saat boot.
2. `curl --fail https://ig.example.com/health` → 200, database connected, environment production. `/api/docs` dan `/api/swagger.yaml` dapat dibuka; `/api/auth/me` tanpa sesi → 401.
3. Callback `https://n8n.example.com/ig-flow-api/api/jobs/00000000-0000-4000-8000-000000000000/manifest` tanpa token → 401, bukan 502/halaman SPA.
4. Login password, Google/Microsoft yang dikonfigurasi dan reset password SMTP diuji. Deep-link callback dan refresh halaman tidak 404.
5. Settings → periksa koneksi Instagram. Ini belum membuktikan izin publish/insights; uji fitur tersebut terpisah.
6. Aktifkan dispatcher AI. Upload satu foto Feed uji: webhook 202 → Claim Job sukses → hasil AI JPEG → READY_FOR_REVIEW. Periksa gambar, logo/footer dan caption. Ulangi Story dan multi-foto bila cakupan release mencakupnya.
7. Preview/presigned URL dapat dibuka dari jaringan luar; tidak bocor credential layanan ke browser.
8. Pada akun uji yang disetujui, publish langsung dan jadwalkan post berikutnya; pastikan PUBLISHED, permalink benar dan hanya satu post per project. Uji Feed carousel 2–10 gambar dan Story satu gambar. Pengujian ini mengirim konten sungguhan; jangan gunakan akun utama tanpa persetujuan pemilik.
9. Analytics memuat data dan cache Redis bekerja; kegagalan Redis tidak dianggap database down. Angka unavailable dibedakan dari nol.
10. Uji restart proses dan reboot terencana sebelum go-live; pastikan API/worker/n8n kembali tanpa start manual atau proses ganda.

Catat commit backend/frontend, workflow version ID, versi n8n/gateway, job ID, hasil test, timestamp dan penanggung jawab. Uji festrack sebelumnya bukan bukti server baru sudah lolos. `/health` hanya membuktikan database/API, bukan storage/SMTP/Redis/Meta/n8n.

## 12. Operasi, update dan rollback

Log/status:

```sh
pm2 status
pm2 logs instagram-flow-be
sudo supervisorctl status 'instagram-flow:*'
sudo supervisorctl tail -f instagram-flow:instagram-flow-jobs
sudo supervisorctl tail -f instagram-flow:instagram-flow-publishing
cd /srv/ig-flow/n8n
docker compose logs --tail=100 n8n
```

Jangan menyalin execution/private log mentah ke tiket publik karena dapat berisi gambar, URL presigned atau informasi request. Worker log berotasi 20 MB/five backups; siapkan rotasi/retensi PM2/nginx/Docker dan monitor disk.

Untuk update: blokir upload/mutasi sementara sesuai maintenance plan, nonaktifkan dispatch AI dan tunggu execution selesai, hentikan publishing setelah pekerjaan aktif selesai, backup, checkout release baru, install dependency, jalankan migration yang disetujui, build, lalu restart API dan worker. Jangan memakai hot reload di production. Perubahan frontend domain/env membutuhkan build ulang; perubahan workflow membutuhkan rebuild/import/publish. Command restart:

```sh
cd /srv/ig-flow/backend
bun install --frozen-lockfile
bun run migration:show
# Jalankan migration:run hanya setelah review/backup bila ada migration pending.
bun run build
pm2 restart instagram-flow-be
sudo supervisorctl restart 'instagram-flow:*'
```

Jika PM2 memakai environment shell yang berubah, restart dengan `--update-env` dari sesi deployment yang benar; `.env` tetap dibaca dari directory aplikasi. Jangan membiarkan environment lama di PM2 menimpa nilai `.env` tanpa disadari.

Backup minimum: dump MySQL konsisten beserta migration ledger, bucket MinIO, JSON Instagram/.env terenkripsi, volume/database n8n beserta encryption key, workflow version/source, konfigurasi gateway dan nginx/process manager, serta commit release. Simpan di lokasi terpisah dengan retensi dan tes restore. Untuk SQLite n8n, hentikan container sebelum snapshot volume atau gunakan mekanisme backup SQLite konsisten; jangan sekadar menyalin database aktif. Redis analytics dapat dibangun ulang dan bukan sumber data utama.

Rollback kode: hentikan worker, kembalikan commit/build frontend-backend dan workflow kompatibel, lalu verifikasi. Jangan otomatis `migration:revert`: baseline menghapus tabel/data. Bila schema tidak backward-compatible, restore backup yang cocok beserta storage. **Postingan yang sudah terkirim ke Instagram tidak dibatalkan oleh rollback database.** Rekonsiliasi publication UNKNOWN/PUBLISHING sebelum mengaktifkan worker agar tidak mengirim ulang hasil restore.

Migrasi server: hentikan penulisan dan worker di server lama, tunggu execution selesai, backup/restore database dan bucket, pindahkan credential/encryption key dengan aman, ubah Configuration workflow/DNS/OAuth/storage endpoint, uji server baru, lalu aktifkan satu set worker saja. Pertahankan server lama berhenti selama cutover; jangan menjalankan dua deployment pada database/antrean yang sama tanpa rencana koordinasi.

## 13. Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| PM2 online tetapi tidak dapat diakses | Working directory, build release terbaru, log HTTP listening, port, health loopback, nginx/firewall |
| API mengembalikan HTML | Location /api salah atau prefix dibuang; periksa proxy_pass |
| Upload 413 | Limit nginx/CDN dan MAX_UPLOAD_MB; callback membutuhkan hingga 64 MiB |
| Claim Job 502/504 | Proxy callback harus ke API server aktif, bukan port tunnel 14000; cek timeout dan listener |
| Callback 401 | Header Auth Backend harus cocok dengan service token backend |
| Webhook 404 | Workflow belum published/active, URL memakai webhook-test, atau restart diperlukan setelah CLI publish |
| Job tetap QUEUED | Worker AI tidak berjalan, dispatcher Settings off, konfigurasi webhook/storage belum lengkap |
| Mark Execution Failed | Itu penanda akhir; lihat node pertama yang gagal pada execution, bukan hanya pesan akhir |
| Gambar AI gagal | Aset brand lengkap, signed URL reachable, response gateway/model image cocok, quota/timeout |
| URL gambar forbidden/expired | Endpoint signing, jam server, TLS, TTL, query/Host berubah di proxy |
| Jadwal tidak terkirim | Worker publishing, status akun/token, jam server, status publication dan snapshot |
| Publication UNKNOWN | Rekonsiliasi container; jangan force retry media_publish atau edit status DB |
| Microsoft invalid credentials | Web redirect URI persis sama, secret aktif, tenant/client ID dan user lokal aktif |
| Worker gagal start | Path Bun/source, permission user, dependency, .env dan koneksi database |
| Redis mati tetapi health hijau | Health hanya memeriksa database; analytics menggunakan fallback Meta |
| Credential n8n tidak dapat dibaca setelah restore | Encryption key tidak sama dengan instance asal |

## 14. Referensi dan batas cakupan

- [Konfigurasi aplikasi](docs/operations/environment.md), [database](docs/operations/database.md), [kontrak n8n](docs/operations/n8n.md), [autentikasi](docs/features/authentication.md).
- [n8n Docker](https://docs.n8n.io/hosting/installation/docker/), [proxy webhook](https://docs.n8n.io/hosting/configuration/configuration-examples/webhook-url/), [Supervisor](https://supervisord.org/configuration.html). Ikuti dokumentasi yang cocok dengan versi yang dipin; nama environment/CLI n8n dapat berubah.

Panduan ini menjelaskan deployment aplikasi yang ada, bukan provisioning cluster HA. Tidak memasang/menjalankan apa pun hanya dengan membuka dokumen. Pada 23 Oktober 2026 festrack telah menguji satu foto Feed sampai READY_FOR_REVIEW; deployment baru tetap wajib menjalankan checklist sendiri.

### Perubahan kontrak keputusan konten

Baseline development 23 Oktober 2026 langsung membuat `rejections`, `rejected_by` dan `decision_status`. Tidak ada migration rename terpisah. Instalasi baru menjalankan 14 baseline schema final; database dari schema lama memerlukan backup dan rekonsiliasi eksplisit atau pembuatan ulang yang telah disetujui, bukan menjalankan baseline di atas tabel lama. API memakai `rejections`, `rejectedBy`, `decisionStatus`, dan `/api/drafts` tanpa alias `/api/review`. Deploy frontend/backend berpasangan. Lihat [database](docs/operations/database.md).

## Telegram opsional

Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID pada environment backend/API dan worker yang sama; keduanya kosong menonaktifkan notifikasi. FRONTEND_URL harus URL frontend publik. Terapkan migration CreateJobNotifications1792490400013 sebelum restart API PM2 serta worker jobs:dispatch Supervisor. Tidak perlu merombak workflow n8n atau membuat worker tambahan. Notification token tidak boleh disimpan dalam workflow export. Lihat [setup, retry dan verifikasi Telegram](docs/features/telegram-notifications.md).
