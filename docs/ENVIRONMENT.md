# ⚙️ Environment & Deployment

Dokumen ini menjelaskan konfigurasi environment, deployment, dan infrastruktur proyek.

---

## 1. Environment Variables

### Daftar Lengkap

Salin `.env.dist` ke `.env` dan isi setiap nilai:

```bash
cp .env.dist .env
```

#### Aplikasi

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `APP_NAME` | string | `hono-be` | Nama service, muncul di setiap baris log JSON (field `service`) — dipakai sebagai label saat scrape ke Grafana Loki |
| `PORT` | number | `4000` | Port server HTTP |
| `ENV` | string | `development` | Environment: `development` / `production` |
| `APP_URL` | string | `http://localhost:4000` | Base URL API publik (signed media n8n) |

#### Database

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `DB_HOST` | string | `localhost` | Host database |
| `DB_PORT` | number | `3306` | Port database MySQL |
| `DB_USER` | string | `root` | Username database |
| `DB_PASS` | string | _(kosong)_ | Password database |
| `DB_NAME` | string | `hono_be` | Nama database |

`DB_ROOT_PASS` digunakan oleh Docker Compose untuk password root MySQL (default lokal: `root`). Template Compose memakai user aplikasi `hono` / password `hono`; ganti password sebelum deployment. `MYSQL_USER` harus user non-root. Untuk MySQL yang sudah tersedia, gunakan kredensial koneksi yang ada.

#### Authentication

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `JWT_SECRET` | string | _(dev only)_ | **WAJIB di production.** Secret key untuk access token (15 menit) |
| `JWT_REFRESH_SECRET` | string | _(dev only)_ | **WAJIB di production.** Secret key untuk refresh token (7 hari) |

#### SMTP (Email)

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `SMTP_HOST` | string | _(kosong)_ | Host SMTP server |
| `SMTP_PORT` | number | _(kosong)_ | Port SMTP (587 untuk TLS, 465 untuk SSL) |
| `SMTP_USER` | string | _(kosong)_ | Username SMTP |
| `SMTP_PASS` | string | _(kosong)_ | Password SMTP |
| `SMTP_FROM` | string | _(kosong)_ | Alamat pengirim email |

#### Google OAuth

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `GOOGLE_CLIENT_ID` | string | _(kosong)_ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | string | _(kosong)_ | Google OAuth Client Secret |

#### MinIO (Object Storage)

| Variable | Tipe | Default | Deskripsi |
|----------|------|---------|-----------|
| `MINIO_ENDPOINT` | string | _(kosong)_ | MinIO server endpoint |
| `MINIO_PORT` | number | `9000` | MinIO server port |
| `MINIO_USE_SSL` | boolean | `false` | Gunakan SSL untuk koneksi MinIO |
| `MINIO_ACCESS_KEY` | string | _(kosong)_ | MinIO access key |
| `MINIO_SECRET_KEY` | string | _(kosong)_ | MinIO secret key |
| `MINIO_BUCKET` | string | `hono-be` | Nama bucket default |

---

## 2. Menambah Environment Variable Baru

Saat menambah env variable baru, update **semua** file berikut:

1. **`src/config/config.ts`** — Tambahkan ke config object
2. **`.env.dist`** — Tambahkan template dengan value kosong/default
3. **`.env`** — Tambahkan value aktual (lokal, jangan commit)
4. **`docker-compose.yaml`** — Tambahkan ke section `environment` service `app`
5. **`docs/ENVIRONMENT.md`** — Update tabel di atas

### Contoh Menambah Config Baru

```typescript
// Di src/config/config.ts:
export const config = {
    // ... existing config
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
    },
}
```

---

## 3. Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- MySQL >= 8.0
- SMTP server (untuk fitur email)

### Menjalankan Lokal

```bash
# Install dependencies
bun install

# Setup environment
cp .env.dist .env
# Edit .env sesuai konfigurasi lokal

# Jalankan development server (hot-reload)
bun run dev
```

Server berjalan di `http://localhost:4000`.

### Endpoints Penting

| URL | Deskripsi |
|-----|-----------|
| `http://localhost:4000/health` | Health check (load balancer/K8s) |
| `http://localhost:4000/api/docs` | Swagger UI |
| `http://localhost:4000/api/swagger.yaml` | OpenAPI Spec |
| `http://localhost:4000/api/...` | API endpoints |

---

## 4. Production Build

```bash
# Build
bun run build

# Output: dist/index.js (single bundled file)

# Start
bun run start
```

---

## 5. Docker Deployment

### Docker Compose (Recommended)

```bash
# Start semua services (app + MySQL)
docker compose up -d

# Lihat logs
docker compose logs -f app

# Stop
docker compose down

# Rebuild setelah code changes
docker compose up -d --build
```

### Services dalam Docker Compose

| Service | Container Name | Port | Deskripsi |
|---------|---------------|------|-----------|
| `app` | `hono-be` | 4000 | Aplikasi backend |
| `db` | `hono-be-db` | 3306 | MySQL 8.4 |

### Docker Build Manual

```bash
# Build image
docker build -t hono-be .

# Run container
docker run -p 4000:4000 --env-file .env hono-be
```

### Dockerfile Details

- **Base image**: `oven/bun:latest`
- **Multi-stage build**: install → prerelease → release
- **Production optimizations**: frozen lockfile, production-only deps, minified bundle
- **Exposed port**: 4000
- **Entry point**: `bun run dist/index.js`

---

## 6. PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitoring
pm2 logs hono-be
pm2 monit

# Restart
pm2 restart hono-be

# Stop
pm2 stop hono-be
```

### PM2 Configuration

```javascript
// ecosystem.config.js
{
    name: "hono-be",
    script: "dist/index.js",
    interpreter: "bun",
    env: { NODE_ENV: "production" },
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
}
```

---

## 7. File & Directory yang Tidak Di-commit

Dikonfigurasi via `.gitignore`:

```
node_modules/       # Dependencies
.env               # Environment variables (RAHASIA)
public/uploads     # Uploaded files
database/          # Database files
dist               # Build output
logs/              # Application logs (JSON, per tanggal)
```

---

## 8. Static Files & Uploads

- Uploads disajikan melalui: `GET /api/uploads/*`
- Root directory: `./public/uploads/`
- Avatar URLs: direct MinIO presigned URLs returned by user/auth serializers.

---

## 9. Logging

Semua log ditulis sebagai **satu baris JSON per event** ke stdout/stderr — format ini siap di-scrape Promtail/Grafana Alloy dan dikirim ke **Grafana Loki** tanpa setup tambahan di aplikasi. Panduan lengkap (skema field, cara menambah log, contoh config Promtail, contoh query LogQL): **`docs/LOGGING_GUIDE.md`**.

### Access Log (per Request)

Dicatat ke stdout untuk semua request, termasuk `requestId` (echo dari header `X-Request-Id` client atau digenerate baru):

```json
{"timestamp":"2026-06-17T15:00:00.000Z","level":"info","service":"hono-be","environment":"production","message":"HTTP request","requestId":"...","method":"GET","path":"/api/contact","statusCode":200,"durationMs":12}
```

### File Log

- Semua level (`debug`/`info`/`warn`/`error`) di-append ke file JSON Lines, **satu file per tanggal**: `logs/app-2026-08-14.log`, `logs/app-2026-08-15.log`, dst (rotasi otomatis, tanggal UTC).
- Berguna untuk deployment non-container yang tail file langsung (bukan stdout container).

### Error Logs

- Semua exception (validasi, business logic, 500) dicatat sebagai baris terpisah dengan detail error.
- Stack trace di response API hanya tampil di environment `development`, tapi selalu ada di log.

---

## 10. Production Safety

| Safety | Behavior |
|--------|----------|
| `JWT_SECRET` tidak di-set | ❌ Crash saat startup |
| `JWT_REFRESH_SECRET` tidak di-set | ❌ Crash saat startup |
| Schema sync (semua environment) | Selalu `false`; gunakan migration |
| Stack trace di response | ⚠️ Hidden di production |

## Migrasi Database yang Sudah Ada

Hentikan aplikasi, lalu dari checkout backend jalankan `bun run migration:run` sebelum menjalankan versi baru. Runner memakai koneksi MySQL dari config dan selalu menonaktifkan synchronize. Migration dijalankan berurutan: users, contacts, lalu password_reset_tokens. Database kosong maupun database yang sudah memiliki tabel menggunakan perintah yang sama. Schema sync selalu false.

## Seeder User

Seeder menggunakan fixture dummy di `src/database/seeders/user.seeder.ts`, tanpa variabel `SEED_USER_*`. Jalankan `bun run seed:users` atau `bun run seed` setelah migration. Akun admin@example.com, budi@example.com, siti@example.com menggunakan password development `password123`; password tetap di-hash oleh UserService. Email existing dilewati tanpa mengganti password/status/nama. Semua akun aktif memiliki akses aplikasi yang sama; nama fixture tidak menentukan hak akses. Sync tetap false; seeder tidak mengubah schema.

Social Agent environment variables and worker commands are documented in `../README_SETUP.md` and `.env.dist`. Secrets are server-only; Settings returns configuration presence and a masked webhook, never credential values.

## Current content storage

One private `MINIO_BUCKET` stores all media, separated by object prefixes: `users/`, `batches/`, and `renders/`. Avatar serializers return direct presigned URLs; the generic proxy endpoint has been removed. Content handlers retain authentication and scoped signatures. MinIO must be reachable from clients using the configured endpoint.

`FRONTEND_URL` berada di config.app.frontendUrl dan digunakan untuk email reset password serta tautan review. APP_URL menunjuk backend/API; jangan gunakan URL frontend untuk signed media.

## Configuration ownership (2026-10-16)

- `.env.dist` is the only backend environment template. Copy it to `.env`; do not maintain a second `.env.example`.
- Use `NODE_ENV`, not `ENV`. Runtime parsing and defaults live in `src/config/config.ts`. Numeric settings must be positive integers; invalid values fail startup without logging their contents.
- Backend defaults to port 4000. Without `APP_URL`, its URL follows `PORT`. Set an explicit external `APP_URL` behind a proxy.
- Schema synchronization is always false. `DB_SYNC` is no longer an accepted setting.
- `databaseOptions` is shared by runtime/CLI and test setup. Tests override the database with `DB_TEST_NAME` (default `hono_be_test`), require a distinct `*_test` name and recreate only that test schema.
- Register migrations once in `src/database/migrations/index.ts`.
- Docker passes `.env` through `env_file`; only container-specific host/port/environment overrides belong in Compose. PM2 sets production once.
One private `MINIO_BUCKET` stores all media, separated by object prefixes: `users/`, `batches/`, and `renders/`. Avatar serializers return direct presigned URLs; the generic proxy endpoint has been removed. Content handlers retain authentication and scoped signatures. MinIO must be reachable from clients using the configured endpoint.
- Frontend `nuxt.config.ts` owns framework/runtime configuration; `app/app.config.ts` owns UI theme defaults. They have different responsibilities. API URL retains `API_BASE_URL` compatibility and defaults to `http://localhost:4000/api`; Nuxt's `NUXT_PUBLIC_API_URL` runtime override remains available.

### Migrating existing content buckets

Before deploying this change, copy objects from the former content bucket into MINIO_BUCKET with the same keys and metadata. Verify every destination object by SHA-256; refuse conflicting keys. Keep the original bucket as a backup until deployment is verified. Remove MINIO_MEDIA_BUCKET from environment files afterward. Do not make the unified bucket public. No database key rewrite is needed.

## Dispatcher dashboard

Sakelar dispatcher tetap disimpan di tabel settings sesuai pilihan pengguna, terpisah dari credential environment. Worker memerlukan sakelar aktif dan konfigurasi HTTPS/secret yang lengkap. TELEGRAM_NOTIFICATION_ENABLED telah dihapus; aplikasi tidak menyimpulkan kesehatan Telegram dari flag manual. Batas upload frontend berasal dari GET /api/batches/limits.

## MinIO presigned media — 2026-10-18

MEDIA_SIGNING_SECRET is removed. The existing MinIO credentials sign preview URLs using getPresignedUrl. SIGNED_MEDIA_URL_TTL_SECONDS remains the preview expiration setting. Configure the MinIO endpoint to be reachable by n8n and the image consumer; the backend API origin is no longer the image URL. Signed URLs grant access until expiry even if an asset is later archived; do not log or persist them. Existing JWT-protected dashboard media handlers remain. Dispatcher readiness checks MinIO configuration, not network reachability.

### n8n with a local backend

For the approved MacBook + server tunnel setup, see [the n8n runbook](../integrations/n8n/README.md). Use `N8N_CONTRACT=camelCase` and distinct webhook/backend service secrets. AI credentials live in n8n, not backend environment. Keep `APP_URL` pointed at the local backend and `FRONTEND_URL` at the local frontend; the workflow configuration contains the dedicated callback tunnel URL.
