# Integrasi n8n — IG Flow

The documented testing topology keeps the backend on the MacBook. This runbook describes configuration; it does not assert that the remote services or tunnel are currently online. n8n runs in Docker on `festrack`; private media uses the existing MinIO bucket. The workflow implements upload event → claim → manifest → OpenAI-compatible photo analysis → caption → feed/story SVG → backend result → internal review. This AI workflow does not publish to Instagram. Instagram Login publishing is handled separately by the backend posts:dispatch worker; see [panduan publikasi Instagram](../features/instagram-publishing.md).

Semua command berikut dijalankan dari direktori `backend/`.

## Source and build

`integrations/n8n/nodes/` contains individual Code-node programs, tested against the backend contract and SVG sanitizer. `integrations/n8n/build-workflow.ts` assembles the importable `ig-flow.workflow.json`. Code-node programs use the n8n sandbox globals, not backend services. They are deployment assets, not another application module.

```sh
bun run integrations/n8n/build-workflow.ts
```

The builder currently supplies the testing backend URL, gateway endpoint and model in the `Configuration` node. For another environment, update those non-secret values in `integrations/n8n/build-workflow.ts`, rebuild the JSON and inspect it before import; editing only the generated JSON is overwritten by the next build. Keep secrets in encrypted n8n credentials. Three **Header Auth** credentials are required, with header name `Authorization` and value `Bearer <secret>`:

| Credential ID | Name | Secret source |
| --- | --- | --- |
| `igFlowWebhookAuth` | IG Flow Webhook | Backend `N8N_WEBHOOK_AUTH_TOKEN` |
| `igFlowBackendAuth` | IG Flow Backend | Backend `N8N_BACKEND_SERVICE_TOKEN` |
| `igFlowAiGateway` | IG Flow AI Gateway | AI provider API key |

Backend `.env` must contain `N8N_CONTRACT=camelCase`, both secrets, and `N8N_WEBHOOK_URL=https://n8n.fajarchan.my.id/webhook/ig-flow/process`. No secret is embedded in the exported workflow. Imported credential IDs must match the workflow references.

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

The server nginx bridge is recorded in `deployment/callback-tunnel.conf`. It exposes only claim, manifest, result and failure routes; every route still requires the backend service credential. The nginx root location continues serving n8n. MySQL stays local and is not exposed by the tunnel. `APP_URL=http://localhost:4000` and `FRONTEND_URL=http://localhost:3000` remain local.

Enable dispatcher in the dashboard's integration settings. Find the background tunnel PID with `pgrep -fl "ssh.*14000"` and stop that specific PID with `kill <PID>`; MacBook sleep/offline interrupts callbacks. Failed jobs can be retried after restoring the backend/tunnel. Outbox delivery retries automatically; the watchdog marks stalled processing jobs failed. This is a testing setup, not an always-on deployment.

## Import and publish

Back up existing workflows and nginx config first. Import using n8n's CLI inside its container, as user `node`, then publish the new workflow ID `igFlowContentV3`. CLI publishing requires a container restart. Preserve unrelated workflows and avoid restarting during active work. Never commit plaintext credential exports; remove temporary credential import files after successful import.

```sh
# Run on the n8n server after copying the generated JSON there.
docker cp ig-flow.workflow.json n8n:/tmp/ig-flow.workflow.json
docker exec -u node n8n n8n import:workflow --input=/tmp/ig-flow.workflow.json
docker exec -u node n8n n8n publish:workflow --id=igFlowContentV3
docker restart n8n
```

## Contract and recovery

- Webhook requires Header Auth. Invalid payload returns 400; valid events receive 202 before AI work.
- Claim uses `eventId` and actual n8n execution ID. Another execution cannot claim a running/completed job. A retry from the same execution can recover a lost claim response.
- Manifest contains direct MinIO presigned URLs. No media proxy or extra signing secret is used.
- Analysis uses deterministic image-1, image-2 aliases in manifest order rather than asking the model to copy database UUIDs. Parse Analysis resolves exact aliases back to IDs and rejects unknown/duplicate IDs; it never guesses a photograph from a malformed ID. Analysis must cover every asset exactly once. Invalid/partial model output fails rather than silently omitting files.
- Exactly one render is produced, matching the scalar event `output` (`feed` or `story`). Story caption and hashtags must be empty. Backend sanitizes SVG, embeds the selected image from object storage and stores generated media in MinIO.
- Post-claim failures call the authenticated failure endpoint with a fixed safe message and then mark the n8n execution failed. Claim errors stop without claiming ownership of another execution.
- Result retries reuse the same payload; backend hashes it and accepts exact duplicates without creating a second draft.
- The workflow ends at READY_FOR_REVIEW. Users then choose Publish or Reject in the dashboard; publishing is handled by posts:dispatch. This AI workflow does not send Telegram messages or publish posts.


### Timeout recovery

A 502 at **Claim Job** can mean the reverse tunnel is absent: nginx cannot connect to server loopback port 14000. Verify local health and the remote listener first, then run the detached SSH command above. Confirm remote `/health` returns 200 and an unauthenticated public callback returns 401 (not 502). This verifies connectivity, not a successful AI execution.

A 504 at **Claim Job** occurs before image analysis/rendering. Check local `/health`, then server port 14000. If the local SSH process is gone but that remote port is still held by an old SSH session, the tunnel is stale. An administrator must inspect the listening SSH PID and terminate only that tunnel session before reconnecting. Do not terminate all SSH sessions or disable authentication.

A job already acknowledged by n8n can remain DISPATCHED when claim cannot reach the backend. After restoring the tunnel, replay its existing event ID and selected output only if it is still unclaimed; never invent an event ID or overwrite a running job. The watchdog eventually exposes a failed job for normal dashboard retry. A detached tunnel survives terminal closure, but does not keep working through MacBook shutdown or network loss; reconnect after restoring connectivity.

## Upgrade single-output contract

Pause dispatch and finish active executions before applying the output migration and publishing the rebuilt workflow. The new event uses scalar `output`, not an array; rebuild with `bun run integrations/n8n/build-workflow.ts`. Upgrade frontend/backend/workflow together. An old two-render callback is rejected rather than silently choosing a placement.
