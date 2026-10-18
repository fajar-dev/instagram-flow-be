> Current baseline: database and migration history were reset on 2026-10-16 by user request. Use the 14 new migrations on a fresh database. See [baseline audit](docs/AUDIT-BASELINE-2026-10-16.md).

# AMTI Social Agent setup

Existing stack: Bun/Hono, MySQL/TypeORM, Nuxt 4/NuxtUI. AI and Telegram run exclusively in n8n. This V1 creates/reviews drafts; it does not publish or schedule Instagram posts.

## Install and migrate

1. Backend: `bun install`, copy `.env.dist` to `.env` only for a new environment; preserve existing secrets otherwise. Configure existing MySQL/JWT values.
2. `bun run migration:run`. Never enable synchronize. Every new table has its own migration. Configure MinIO before upgrading an installation with existing SVG renders: the render migration verifies copied objects before removing inline media.
3. Create users through existing registration or `bun run seed:users` (development demo only). All active authenticated users have the same application access.
4. `bun run dev` or `bun run start`. Frontend: `bun install`, configure existing API base URL and `bun run dev`. `/` redirects to `/overview`.
5. There are no user roles or ownership-based visibility restrictions. User JWT authentication, service-secret authentication for n8n and media signatures remain required.

## Private storage

Use the existing `MINIO_*` credentials/endpoint and one private `MINIO_BUCKET` for all objects. Runtime storage uses the existing MinIO helper. Originals are immutable; sharp generates metadata-free JPEG previews. Back up MySQL and this bucket together.

Uploaded originals, JPEG previews and sanitized SVG renders are stored in MinIO. MySQL stores object keys and metadata only. There is no local media adapter, directory fallback or local-import command. Static frontend branding/icons remain application build assets; browser Blob URLs are temporary previews, not persisted storage.

The generic `/api/proxy` endpoint has been removed. Avatar serializers return direct MinIO presigned URLs. Dashboard media uses bearer-authenticated handlers, and n8n receives expiring preview-only MinIO presigned URLs.

## n8n V0.2 integration

- Source reviewed: supplied `AMTI_n8n_OpenAI_Workflow_V0_2.json`. Never commit credential-bearing workflow exports.
- `N8N_CONTRACT=legacy` translates only documented integration keys to/from snake_case. Claims include execution_id AND event_id (the actual workflow supplies both).
- Claim/manifest/result/failure responses are intentionally flat JSON for n8n compatibility; dashboard responses retain ApiResponse. Errors use the existing envelope.
- Configure `AMTI_API_BASE_URL` and backend service Bearer token in n8n. Backend `N8N_BACKEND_SERVICE_TOKEN` must be a dedicated high entropy secret distinct from user JWT secrets; rotate in both places.
- Configure backend `N8N_WEBHOOK_URL` (HTTPS), `N8N_WEBHOOK_AUTH_TOKEN` and matching n8n webhook authentication. The provided workflow's webhook must actually validate this token before enabling dispatch.
- Set backend `APP_URL` to the externally reachable HTTPS API origin, `FRONTEND_URL` to dashboard origin, and configure the existing MinIO endpoint/credentials. Signed URLs are asset-scoped, preview-only and short lived.
- Enable dispatch in Settings after configuration. Run `bun run jobs:dispatch` as a separate supervised worker; `bun run jobs:dispatch --once` performs one sweep. Database migrations and seeders remain explicit CLI commands, never worker jobs.
- Worker leases outbox entries, retries with backoff and runs watchdog even when dispatch is disabled. Run one or more workers against the same DB. Reverse proxy rate limits are required for distributed deployments.
- V0.2 analyzes only first 20 photos. App accepts 30 uploads but explicitly rejects processing >20 by default. Use batches of at most 20 or upgrade the workflow before increasing MAX_FILES_PER_AI_JOB. No silent slicing.
- Callback must include a valid ranking for EVERY batch photo and each requested render. Partial AI responses cannot become READY_FOR_REVIEW.
- SVG parses through a strict XML allowlist. Images must reference the selected asset's signed API path. Backend embeds the sanitized JPEG; no remote fetch and no expired photo URL in stored preview. UI renders an image blob, not SVG markup.
- Editing any content marks preview OUTDATED and clears internal approval. UI falls back to source photo until n8n gains re-render support. APPROVED_INTERNAL is not PUBLISH_READY.

## Operations and verification

- Health: existing `/health`; Settings only reports safe configuration presence, NOT a successful live n8n/Telegram health check. Job success/failure and logs reflect persisted processing.
- MySQL stores UTC (`timezone: Z`), dashboard displays Asia/Jakarta.
- `bun run typecheck`, `bun run build`, `bun test --timeout 30000` in backend. Tests use `hono_be_test`, which must be an isolated disposable DB: the suite drops/recreates its schema. Do not point DB_TEST_NAME at production/development.
- Frontend: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.
- Tests use synthetic photos and mocked dispatch transport; no AI generation or Telegram messages are triggered by the suite.
- Live UAT remains required: configure webhook auth, run upload → claim → manifest → AI → callback → review; verify vision support and Telegram. No production deployment was performed.
- TLS/private-network protection of the AI gateway is an n8n operational prerequisite. Do not put gateway keys in dashboard settings.

## Known scope limits

No final AMTI raster template, Meta OAuth, publishing, scheduling, interactive Telegram approval or Instagram analytics. No fabricated rankings/templates/metrics. File retention and backup/restore drills need deployment policy. Current upload rate limiter is in-process; use reverse-proxy shared limits. Abandoned uploaded files are preserved for manual retention policy, not automatically deleted.

## API route update

All feature endpoints use /api/<resource> without the former /social prefix. Re-import AMTI_n8n_OpenAI_Workflow_V0_2_api_routes.json (generated in Downloads) for claim/manifest/result/failure callbacks. Deploy backend and frontend together. Finish or retry jobs whose previously issued manifests contain old media URLs.

Media signing now uses MinIO directly. MINIO_ENDPOINT / MINIO_PORT / MINIO_USE_SSL must describe an endpoint reachable by n8n and its image consumer. Use HTTPS in deployment. Do not rewrite a presigned URL host after signing; its host is part of the signature. MEDIA_SIGNING_SECRET and /api/media-access have been removed.
