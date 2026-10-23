# Integrasi n8n — IG Flow

Production menjalankan backend dan n8n pada server yang sama. Callback diarahkan nginx ke backend server; tunnel MacBook hanya untuk development. n8n runs in Docker on `festrack`; private media uses the existing MinIO bucket. The workflow implements upload event → claim → manifest → OpenAI-compatible photo analysis → caption → AI image editing (feed/story) → backend result → internal review. This AI workflow does not publish to Instagram. Instagram Login publishing is handled separately by the backend posts:dispatch worker; see [panduan publikasi Instagram](../features/instagram-publishing.md).

Semua command berikut dijalankan dari direktori `backend/`.

## Source and build

`integrations/n8n/nodes/` contains individual Code-node programs, tested against the backend callback contract. `integrations/n8n/build-workflow.ts` assembles the importable `ig-flow.workflow.json`. Code-node programs use the n8n sandbox globals, not backend services. They are deployment assets, not another application module.

```sh
bun run integrations/n8n/build-workflow.ts
```

The builder supplies the callback bridge URL, gateway endpoint and model in the `Configuration` node. For another environment, update those non-secret values in `integrations/n8n/build-workflow.ts`, rebuild the JSON and inspect it before import; editing only the generated JSON is overwritten by the next build. Keep secrets in encrypted n8n credentials. Three **Header Auth** credentials are required, with header name `Authorization` and value `Bearer <secret>`:

| Credential ID | Name | Secret source |
| --- | --- | --- |
| `igFlowWebhookAuth` | IG Flow Webhook | Backend `N8N_WEBHOOK_AUTH_TOKEN` |
| `igFlowBackendAuth` | IG Flow Backend | Backend `N8N_BACKEND_SERVICE_TOKEN` |
| `igFlowAiGateway` | IG Flow AI Gateway | AI provider API key |

Backend `.env` must contain both secrets, and `N8N_WEBHOOK_URL=https://n8n.fajarchan.my.id/webhook/ig-flow/process`. No secret is embedded in the exported workflow. Imported credential IDs must match the workflow references.

## Production callback dan dispatcher

Konfigurasi nginx dan Supervisor tersedia di [DEPLOYMENT.md](../../DEPLOYMENT.md). Callback festrack diteruskan langsung ke backend port 8002. API dikelola PM2; dispatcher AI dan worker publishing dikelola Supervisor. API saja tidak mengirim antrean: dispatcher pada Settings harus enabled.

Backend membutuhkan N8N_WEBHOOK_URL HTTPS, N8N_WEBHOOK_AUTH_TOKEN dan N8N_BACKEND_SERVICE_TOKEN yang cocok dengan credential n8n. Workflow tetap memakai URL Configuration dengan suffix `/ig-flow-api`.

Verifikasi production harus mencakup: health backend, callback tanpa token mendapat 401 (bukan 502), webhook terautentikasi menerima event, Claim Job, manifest/media, hasil gambar AI dan callback hingga READY_FOR_REVIEW. Pemeriksaan koneksi saja tidak membuktikan workflow AI berhasil. Job pengujian tidak perlu dipublikasikan ke Instagram.

Verifikasi festrack pada 23 Oktober 2026: execution n8n `39` memproses satu foto Feed hingga job `4625a613-8fd3-4352-a66a-0111c49a3f40` berstatus READY_FOR_REVIEW, dengan render JPEG 1080×1350 tersimpan di backend. Pengujian tidak melakukan publikasi Instagram dan belum mencakup Story atau carousel multi-foto. API tetap dikelola PM2, sementara dispatcher AI dan worker publikasi dikelola Supervisor; health dan akses callback diperiksa kembali. n8n tetap berjalan di Docker.

## Run locally with the server callback tunnel

Keep backend and worker running. Start the SSH tunnel as a detached background process so it does not depend on the terminal/tool session:

```sh
# Terminal 1, backend/
bun run dev

# Terminal 2, backend/
bun run jobs:dispatch

# MacBook: starts the tunnel in the background
ssh -f -N -o BatchMode=yes -o ConnectTimeout=10 -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 -R 127.0.0.1:14000:127.0.0.1:4000 festrack
```

The server nginx bridge is recorded in `integrations/n8n/deployment/callback-tunnel.conf`. It exposes only claim, manifest, result and failure routes; every route still requires the backend service credential. The nginx root location continues serving n8n. MySQL stays local and is not exposed by the tunnel. `APP_URL=http://localhost:4000` and `FRONTEND_URL=http://localhost:3000` remain local.

Enable dispatcher in the dashboard's integration settings. Find the background tunnel PID with `pgrep -fl "ssh.*14000"` and stop that specific PID with `kill <PID>`; MacBook sleep/offline interrupts callbacks. Failed jobs can be retried after restoring the backend/tunnel. Outbox delivery retries automatically; the watchdog marks stalled processing jobs failed. This is a testing setup, not an always-on deployment.

## Import and publish

Back up existing workflows and nginx config first. Import using n8n's CLI inside its container, as user `node`, then publish the new workflow ID `igFlowContentV3`. CLI publishing requires a container restart. Preserve unrelated workflows and avoid restarting during active work. Never commit plaintext credential exports; remove temporary credential import files after successful import. When replacing an existing published workflow, unpublish it during a quiet window before import, then publish the imported current version and restart. n8n may generate a different version ID during import; do not assume the supplied ID is retained. Verify the next execution contains the updated Code nodes, not just the editor draft.

```sh
# Run on the n8n server after copying the generated JSON there.
docker cp ig-flow.workflow.json n8n:/tmp/ig-flow.workflow.json
docker exec -u node n8n n8n unpublish:workflow --id=igFlowContentV3
docker exec -u node n8n n8n import:workflow --input=/tmp/ig-flow.workflow.json
docker exec -u node n8n n8n publish:workflow --id=igFlowContentV3
docker restart n8n
```

## Contract and recovery

- Webhook requires Header Auth. Invalid payload returns 400; valid events receive 202 before AI work.
- Claim uses `eventId` and actual n8n execution ID. Another execution cannot claim a running/completed job. A retry from the same execution can recover a lost claim response.
- Manifest contains direct MinIO presigned URLs. No media proxy or extra signing secret is used.
- Analysis splits uploads into one request per photo, staggered by three seconds and merges all successful responses before validating full asset coverage. Empty/non-final gateway responses fail explicitly instead of producing a JSON syntax error. The parser derives up to five cover candidates from validated ranking scores across photos; it does not depend on a model-provided selection list. Every photo must still have exactly one valid score and reason. This is not a single joint comparison of all photos.
- Analysis uses deterministic image-1, image-2 aliases in manifest order rather than asking the model to copy database UUIDs. Parse Analysis resolves exact aliases back to IDs and rejects unknown/duplicate IDs; it never guesses a photograph from a malformed ID. Analysis must cover every asset exactly once. Invalid/partial model output fails rather than silently omitting files.
- Before image editing, n8n downloads each unique reference/source URL without service credentials, validates JPEG/PNG signatures and size limits (12 MiB each, 48 MiB total), then sends inline image data to the gateway. This avoids upstream provider URL-download timeouts. Failed downloads fail the job; there is no raw-photo fallback. Execution data contains private images: restrict access and retain it only as needed for debugging.
- Feed produces one edited render per uploaded asset (up to 19); Story produces one. The scalar event output remains feed or story. Story caption and hashtags must be empty. Callback includes imageBase64 from the image model. Backend validates raster bytes and normalizes size before storing the result in MinIO; it does not draw a template.
- Post-claim failures call the authenticated failure endpoint with a fixed safe message and then mark the n8n execution failed. Claim errors stop without claiming ownership of another execution.
- Result retries reuse the same payload; backend hashes it and accepts exact duplicates without creating a second draft.
- The workflow ends at READY_FOR_REVIEW. Users then choose Publish or Reject in the dashboard; publishing is handled by posts:dispatch. This AI workflow does not send Telegram messages or publish posts.


### Timeout recovery

A 502 at **Claim Job** can mean the reverse tunnel is absent: nginx cannot connect to server loopback port 14000. Verify local health and the remote listener first, then run the detached SSH command above. Confirm remote `/health` returns 200 and an unauthenticated public callback returns 401 (not 502). This verifies connectivity, not a successful AI execution.

A 504 at **Claim Job** occurs before image analysis/rendering. Check local `/health`, then server port 14000. If the local SSH process is gone but that remote port is still held by an old SSH session, the tunnel is stale. An administrator must inspect the listening SSH PID and terminate only that tunnel session before reconnecting. Do not terminate all SSH sessions or disable authentication.

A job already acknowledged by n8n can remain DISPATCHED when claim cannot reach the backend. After restoring the tunnel, replay its existing event ID and selected output only if it is still unclaimed; never invent an event ID or overwrite a running job. The watchdog eventually exposes a failed job for normal dashboard retry. A detached tunnel survives terminal closure, but does not keep working through MacBook shutdown or network loss; reconnect after restoring connectivity.

## Upgrade single-output contract

Pause dispatch and finish active executions before applying the output migration and publishing the rebuilt workflow. The new event uses scalar `output`, not an array; rebuild with `bun run integrations/n8n/build-workflow.ts`. Upgrade frontend/backend/workflow together. An old two-render callback is rejected rather than silently choosing a placement.

## Codex image editing gateway — 21 October 2026

The tested 9router 0.5.95 adapter exposes reference-image editing through JSON `POST /v1/images/generations` with `model: cx/gpt-image-2`, `images: [presignedUrl]`, and `output_format: jpeg`. The ordinary Responses route removes the image tool, and multipart `/images/edits` returned a server error; do not switch endpoints without testing the adapter.

Its built image adapter originally hardcoded `gpt-5.5` as the orchestration model, which this Codex account rejected. Both the source adapter and compiled image route were patched to `gpt-6.1-sol`. Image pixels still come from `gpt-image-2`; this is separate from the analysis/caption model. The reproducible patch is `integrations/n8n/deployment/patch-codex-image-model.mjs`. Back up the container files before applying. Copy it into the gateway container and run with Node, then restart the gateway in a quiet window. Container recreation/image upgrades remove this patch: apply against a compatible build or upgrade to a gateway supporting the correct model configuration, then retest. Do not modify provider credentials.

The callback nginx body limit and backend callback limit are 64 MiB for the complete callback (individual images remain limited to 16 MiB base64). Image requests have a five-minute timeout; workflow timeout is two hours, with two image requests running per batch and signed source URLs valid for at least 7500 seconds. A failed/empty image response reports failure and never substitutes a local template. Prompt uses source photos and factual metadata; human review remains required.

## Referensi desain AMTI

Jalankan `bun run brand:upload <referensi.png> <amti-logo.png> <partner-logo.jpeg>` sebelum memakai workflow pada bucket baru. Manifest menyediakan URL presigned referensi dan logo. Prepare Design mengirim referensi sebagai image 1, logo AMTI sebagai image 2, logo Graha Survei sebagai image 3, lalu foto asli; jangan memperlakukan contoh poster sebagai dokumentasi proyek. Lihat [panduan desain](../features/post-templates.md).
