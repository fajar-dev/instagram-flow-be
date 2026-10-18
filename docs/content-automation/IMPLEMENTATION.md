# Social Agent implementation

## Assessment and decisions

Reuse Bun/Hono + TypeORM/MySQL, JWT auth, Nuxt 4/NuxtUI and en/id. Do not add Flask, PostgreSQL, AI SDK or Instagram publishing. Physical table/column names use existing snake_case convention, JSON and TS use camelCase. Social UUID IDs coexist with existing integer user IDs.

New backend files: social entities, repository interface/implementation, service/controller/module, validators, serializers, private media adapter, n8n adapter, dispatcher command; one migration per new table plus users role migration. Existing database/config/routes/auth serializers/user management require integration. Frontend: social service/types/composables/components and overview/upload/jobs/studio/review/media/logs/settings pages, navigation and en/id strings. Tests: DB lifecycle, concurrency, permissions, uploads, sanitizer and integration fixtures. Docs: API, setup and limitations.

Private content files reuse the existing MinIO helper with one private bucket shared with avatars; the generic avatar proxy is removed. Original images remain immutable; sharp decodes and re-encodes an EXIF-free JPEG for AI. SVG is parsed with an allowlist, remote image references are replaced only with the known selected safe asset embedded locally; no arbitrary fetch. UI renders SVG as an image blob, never inline HTML.

JWT header auth is retained (no cookies, so cookie-CSRF does not apply); role comes from database. Existing user management becomes ADMIN-only to prevent privilege escalation. New/Google users default UPLOADER. Explicit CLI bootstrap assigns an admin; no automatic elevation of all existing users.

Use header Idempotency-Key. Upload staged batches then process atomically creates job/outbox. Default legacy workflow max 20 assets/job, upload supports 30; process rejects larger batches explicitly until operator upgrades workflow and configured limit. No silent truncation.

Workflow JSON/real callback fixtures and deployment credentials were not supplied initially. Legacy adapter coverage uses PRD fixtures, not a claim of proven V0.2 compatibility. Do not claim external n8n/AI/Telegram UAT complete without live evidence.

## Actual workflow inspection

The supplied V0.2 sends snake_case including execution_id/event_id on claim; its IF node reads claimed at root and manifest fields at root. The adapter supports this exactly. AI photo node slices 20; renderer consumes selected_asset_ids[0]. The upstream parser clamps scores and may filter incomplete rankings: backend independently requires complete valid rankings. No raw workflow export (potential credentials) copied into repo.

Approval roles follow the more restrictive API table: ADMIN/REVIEWER; MARKETING edits and requests review but cannot approve. New tables use local UUIDs and existing user integer IDs. Original and generated preview are separate storage objects. Sanitized SVG is stored transactionally as mediumtext rather than an external SVG object, so result/draft/render atomicity has no object-store commit gap.

## Verification 2026-10-16

- MySQL development migrations: no pending migrations; synchronize remains false.
- Backend typecheck/build pass. Full MySQL suite: 134 passed; final social-specific suite after additional limit/Telegram checks: 12 passed, 62 assertions. Initial full-suite attempt hit the default 5-second database hook timeout; rerun with documented 30-second timeout passed.
- Frontend typecheck, ESLint, 16 tests (66 assertions), and production build pass.
- OpenAPI YAML and internal references parsed successfully.
- Browser visual UAT could not be completed: localhost browser origin permission was declined. No alternate browser workaround was attempted.
- Live n8n/vision/Telegram UAT is pending deployment configuration. Only schema inspection of the provided workflow and synthetic callbacks/mock transport were exercised.
- Test fixtures live in `test/content-workflow.test.ts` and `test/helpers.ts`; no real project photos or workflow credentials are committed.

## Remaining external prerequisites

Provide reachable HTTPS backend/webhook origins and dedicated integration secrets; configure webhook authentication in n8n; verify gateway vision and Telegram on the deployed workflow. Supply an approved AMTI raster template for publication-ready rendering in a future step. Current V1 approval is internal, and stored SVG remains a preview. The original workflow JSON stays in Downloads.

## Current structure and storage

The final feature boundaries, MinIO reuse, verified legacy-media import and updated frontend routes are documented in [REFACTOR-2026-10-16.md](REFACTOR-2026-10-16.md). These decisions supersede the earlier grouped-social/local-storage implementation.
