# IG Flow n8n integration

The backend remains on the MacBook, as requested. n8n runs in Docker on `festrack`; private media uses the existing MinIO bucket. The workflow implements upload event → claim → manifest → OpenAI-compatible photo analysis → caption → feed/story SVG → backend result → internal review. It does not publish to Instagram: Meta account linking, access tokens and a publish adapter are not implemented in this application.

## Source and build

`nodes/` contains individual Code-node programs, tested against the backend contract and SVG sanitizer. `build-workflow.ts` assembles the importable `ig-flow.workflow.json`. Code-node programs use the n8n sandbox globals, not backend services. They are deployment assets, not another application module.

```sh
bun run integrations/n8n/build-workflow.ts
```

Keep configuration in the `Configuration` node and secrets in encrypted n8n credentials. Three **Header Auth** credentials are required, with header name `Authorization` and value `Bearer <secret>`:

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
docker exec -u node n8n n8n import:workflow --input=/tmp/ig-flow.workflow.json
docker exec -u node n8n n8n publish:workflow --id=igFlowContentV3
docker restart n8n
```

## Contract and recovery

- Webhook requires Header Auth. Invalid payload returns 400; valid events receive 202 before AI work.
- Claim uses `eventId` and actual n8n execution ID. Another execution cannot claim a running/completed job. A retry from the same execution can recover a lost claim response.
- Manifest contains direct MinIO presigned URLs. No media proxy or extra signing secret is used.
- Analysis must cover every asset exactly once. Invalid/partial model output fails rather than silently omitting files.
- Only requested feed/story placements are rendered. Backend sanitizes SVG, embeds the selected image from object storage and stores generated media in MinIO.
- Post-claim failures call the authenticated failure endpoint with a fixed safe message and then mark the n8n execution failed. Claim errors stop without claiming ownership of another execution.
- Result retries reuse the same payload; backend hashes it and accepts exact duplicates without creating a second draft.
- Review/approval remains internal; this workflow does not send Telegram messages or publish to social accounts.


### Timeout recovery

A 504 at **Claim Job** occurs before image analysis/rendering. Check local `/health`, then server port 14000. If the local SSH process is gone but that remote port is still held by an old SSH session, the tunnel is stale. An administrator must inspect the listening SSH PID and terminate only that tunnel session before reconnecting. Do not terminate all SSH sessions or disable authentication.

A job already acknowledged by n8n can remain DISPATCHED when claim cannot reach the backend. After restoring the tunnel, replay its existing event ID and requested outputs only if it is still unclaimed; never invent an event ID or overwrite a running job. The watchdog eventually exposes a failed job for normal dashboard retry. A detached tunnel survives terminal closure, but does not keep working through MacBook shutdown or network loss; reconnect after restoring connectivity.
