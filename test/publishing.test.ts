import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import type { Hono } from "hono"
import {
    cleanTestDatabase,
    createTestApp,
    destroyTestDatabase,
    initTestDatabase,
    registerAndLogin,
    request
} from "./setup"
import {
    publishingRepository as repo,
    publicationMedia
} from "../src/modules/publishing/publishing.module"
import { instagramService } from "../src/modules/instagram/instagram.module"
import { InstagramService } from "../src/modules/instagram/instagram.service"
import { JsonInstagramCredentials } from "../src/modules/instagram/adapters/json-credentials.adapter"
import {
    GraphInstagramApi,
    InstagramApiError
} from "../src/modules/instagram/adapters/graph-api.adapter"
import { PublicationWorker } from "../src/modules/publishing/publication-worker.service"
import { contentMedia } from "../src/modules/content/content.module"
import { contentHash } from "../src/modules/shared/workflow.helpers"
import type { IInstagramApi } from "../src/modules/instagram/interfaces/instagram.interface"

let app: Hono
let requireAccount: ReturnType<typeof spyOn>
let signed: ReturnType<typeof spyOn>
const account = (key: string) => ({
    key,
    label: key,
    instagramUserId: key === "one" ? "111" : "222",
    accessToken: "private-test-token",
    enabled: true,
    tokenExpiresAt: null
})
beforeAll(async () => {
    await initTestDatabase()
    app = createTestApp()
    requireAccount = spyOn(instagramService, "requireAccount").mockImplementation(async (key) => {
        if (!["one", "two"].includes(key)) {
            throw new Error("unavailable")
        }
        return { account: account(key), graphVersion: "v24.0", appSecret: "" }
    })
    signed = spyOn(publicationMedia, "url").mockImplementation(
        async (key) => `https://storage.test/${key}?signature=test`
    )
})
beforeEach(cleanTestDatabase)
afterAll(async () => {
    requireAccount.mockRestore()
    signed.mockRestore()
    await destroyTestDatabase()
})

async function fixture() {
    const auth = await registerAndLogin(app)
    const batchId = crypto.randomUUID(),
        assetId = crypto.randomUUID(),
        jobId = crypto.randomUUID(),
        draftId = crypto.randomUUID()
    const key = `batches/${batchId}/preview/${assetId}.jpg`
    await contentMedia.put(
        key,
        await sharp({ create: { width: 24, height: 40, channels: 3, background: "#2d4e6f" } })
            .jpeg()
            .toBuffer()
    )
    await repo.save("batch", {
        id: batchId,
        uploaderId: auth.user.id,
        projectName: "Test",
        activity: "Inspection",
        location: "Jakarta",
        documentationDate: "2026-10-19",
        description: "",
        clientName: "",
        publicationPermission: true,
        consentBy: auth.user.id,
        consentAt: new Date(),
        status: "LOCKED",
        idempotencyKey: crypto.randomUUID()
    })
    await repo.save("asset", {
        id: assetId,
        batchId,
        originalStorageKey: key,
        safePreviewStorageKey: key,
        sha256: "a".repeat(64),
        mime: "image/jpeg",
        byteSize: 200,
        width: 24,
        height: 40,
        deletedAt: null
    })
    await repo.save("job", {
        id: jobId,
        batchId,
        requestedOutputs: ["feed"],
        status: "READY_FOR_REVIEW",
        attemptNo: 1,
        retryable: false,
        createdBy: auth.user.id,
        idempotencyKey: crypto.randomUUID()
    })
    const content = {
        primaryAssetId: assetId,
        title: "Inspection",
        caption: "AMTI inspection",
        hashtags: ["#AMTI"],
        location: "Jakarta",
        activity: "Inspection"
    }
    await repo.save("draft", {
        id: draftId,
        jobId,
        reviewStatus: "READY_FOR_REVIEW",
        ...content,
        contentHash: contentHash(content)
    })
    const payload = {
        expectedContentHash: contentHash(content),
        content,
        accountKey: "one",
        source: "photo",
        placement: "feed",
        scheduledAt: null
    }
    const enqueue = (body = payload, requestKey = crypto.randomUUID()) =>
        request(app, `/api/drafts/${draftId}/publications`, {
            method: "POST",
            headers: { ...auth.headers, "Idempotency-Key": requestKey },
            body
        })
    return { ...auth, draftId, batchId, payload, enqueue }
}

class FakeGraph implements IInstagramApi {
    creates = 0

    publishes = 0

    state = "FINISHED"

    ambiguous = false

    failLink = false

    createFailure = false

    async profile() {
        return { id: "111", username: "test" }
    }

    async create() {
        this.creates++
        if (this.createFailure) {
            throw new InstagramApiError(190, false)
        }
        return "123"
    }

    async status() {
        return this.state
    }

    async publish() {
        this.publishes++
        if (this.ambiguous) {
            throw new InstagramApiError(0, true)
        }
        return "456"
    }

    async permalink() {
        if (this.failLink) {
            throw new Error("lookup failed")
        }
        return "https://www.instagram.com/p/test/"
    }
}

async function due(id: string) {
    await repo.save("publication", { id, nextAttemptAt: new Date(Date.now() - 1000) })
}

const worker = (api: IInstagramApi) =>
    new PublicationWorker(repo, api, instagramService, publicationMedia)

describe("Instagram publishing", () => {
    test("new endpoints require active user authentication", async () => {
        for (const [method, path] of [
            ["GET", "/api/instagram/accounts"],
            ["POST", "/api/instagram/accounts/one/verify"],
            ["GET", "/api/drafts/x/publications"],
            ["POST", "/api/drafts/x/publications"],
            ["POST", "/api/publications/x/cancel"],
            ["POST", "/api/publications/x/retry"],
            ["GET", "/api/publications/x/image"]
        ]) {
            expect((await app.request(path!, { method })).status).toBe(401)
        }
    })
    test("JSON credentials reload safely, redact secrets and reject duplicate keys", async () => {
        const dir = await mkdtemp(join(tmpdir(), "ig-credentials-"))
        const file = join(dir, "accounts.json")
        try {
            const adapter = new JsonInstagramCredentials(file)
            expect((await adapter.read()).accounts).toEqual([])
            const config = {
                graphVersion: "v24.0",
                app: { appId: "1", appSecret: "secret-value" },
                accounts: [account("one")]
            }
            await writeFile(file, JSON.stringify(config))
            const service = new InstagramService(adapter)
            const publicData = await service.accounts()
            expect(publicData[0]?.configured).toBe(true)
            expect(JSON.stringify(publicData)).not.toContain("secret")
            expect(JSON.stringify(publicData)).not.toContain("private-test-token")
            config.accounts[0]!.enabled = false
            await writeFile(file, JSON.stringify(config))
            await expect(service.requireAccount("one")).rejects.toThrow()
            config.accounts.push(account("one"))
            await writeFile(file, JSON.stringify(config))
            await expect(adapter.read()).rejects.toThrow("Instagram credential file is invalid")
        } finally {
            await rm(dir, { recursive: true, force: true })
        }
    })
    test("Graph adapter keeps tokens in Authorization and sanitizes provider errors", async () => {
        const service = new InstagramService({
            read: async () => ({
                graphVersion: "v24.0",
                app: { appId: "", appSecret: "proof-secret" },
                accounts: [account("one")]
            })
        })
        let seenUrl = "",
            authHeader = ""
        const api = new GraphInstagramApi(service, (async (url: any, options: any) => {
            seenUrl = String(url)
            authHeader = options.headers.Authorization
            return Response.json(
                { error: { code: 190, message: "leaked-token-value" } },
                { status: 400 }
            )
        }) as typeof fetch)
        await expect(api.profile("one")).rejects.toThrow("Instagram API request failed (190)")
        expect(seenUrl).not.toContain("private-test-token")
        expect(new URL(seenUrl).origin).toBe("https://graph.instagram.com")
        expect(seenUrl).not.toContain("appsecret_proof=")
        expect(authHeader).toBe("Bearer private-test-token")
    })
    test("Instagram Login publishes without a Facebook Page through the Instagram host", async () => {
        const service = new InstagramService({
            read: async () => ({
                graphVersion: "v24.0",
                app: { appId: "", appSecret: "" },
                accounts: [account("one")]
            })
        })
        const paths: string[] = []
        const api = new GraphInstagramApi(service, (async (input: any, options: any) => {
            const url = new URL(String(input))
            expect(url.origin).toBe("https://graph.instagram.com")
            expect(options.headers.Authorization).toBe("Bearer private-test-token")
            expect(url.searchParams.has("access_token")).toBe(false)
            paths.push(url.pathname)
            if (url.pathname.endsWith("/content_publishing_limit")) {
                return Response.json({ data: [{ quota_usage: 0, config: { quota_total: 100 } }] })
            }
            if (url.pathname.endsWith("/media")) {
                const body = new URLSearchParams(options.body)
                expect(body.get("image_url")).toBe("https://storage.example/image.jpg")
                expect(body.get("caption")).toBe("AMTI")
                return Response.json({ id: "444" })
            }
            if (url.pathname.endsWith("/media_publish")) {
                expect(new URLSearchParams(options.body).get("creation_id")).toBe("444")
                return Response.json({ id: "555" })
            }
            return Response.json({ status_code: "FINISHED" })
        }) as typeof fetch)
        expect(await api.create("one", "https://storage.example/image.jpg", "AMTI", "feed")).toBe(
            "444"
        )
        expect(await api.status("one", "444")).toBe("FINISHED")
        expect(await api.publish("one", "444")).toBe("555")
        expect(paths).toEqual([
            "/v24.0/111/content_publishing_limit",
            "/v24.0/111/media",
            "/v24.0/444",
            "/v24.0/111/media_publish"
        ])
        expect(await service.accounts()).toEqual([
            {
                key: "one",
                label: "one",
                instagramUserId: "111",
                enabled: true,
                tokenExpiresAt: null,
                configured: true,
                expired: false
            }
        ])
    })
    test("one project freezes one JPEG snapshot and preserve idempotency under concurrent requests", async () => {
        const f = await fixture()
        const key = crypto.randomUUID()
        const responses = await Promise.all([f.enqueue(f.payload, key), f.enqueue(f.payload, key)])
        expect(responses.map((r) => r.status)).toEqual([202, 202])
        expect(responses[0]!.body.data.id).toEqual(responses[1]!.body.data.id)
        const rows = await repo.find("publication", { draftId: f.draftId })
        expect(rows).toHaveLength(1)
        expect(JSON.stringify(responses[0]!.body)).not.toContain("mediaKey")
        const image = await app.request(`/api/publications/${rows[0]!.id}/image`, {
            headers: f.headers
        })
        expect(image.status).toBe(200)
        const metadata = await sharp(Buffer.from(await image.arrayBuffer())).metadata()
        expect([metadata.format, metadata.width, metadata.height]).toEqual(["jpeg", 1080, 1350])
        await repo.save("draft", { id: f.draftId, caption: "changed later" })
        expect((await repo.get("publication", rows[0]!.id))!.snapshot.caption).toBe(
            "AMTI inspection\n\n#AMTI"
        )
        expect((await f.enqueue({ ...f.payload, placement: "story" }, key)).status).toBe(409)
        expect((await f.enqueue()).status).toBe(409)
    })
    test("different accounts racing for one project create exactly one publication", async () => {
        const f = await fixture()
        const results = await Promise.all([
            f.enqueue(),
            f.enqueue({ ...f.payload, accountKey: "two" })
        ])
        expect(results.map((r) => r.status).sort()).toEqual([202, 409])
        const rows = await repo.find("publication", { batchId: f.batchId })
        expect(rows).toHaveLength(1)
        expect((await repo.get("draft", f.draftId))!.reviewStatus).toBe("PUBLISH")
        const counts = await request(app, "/api/content/counts?days=30", { headers: f.headers })
        expect(counts.body.data.PUBLISH).toBe(1)
        expect(counts.body.data.READY_FOR_REVIEW).toBe(0)
        const draft = (await repo.get("draft", f.draftId))!
        expect(
            (
                await request(app, `/api/drafts/${f.draftId}/reject`, {
                    method: "POST",
                    headers: f.headers,
                    body: { contentHash: draft.contentHash, notes: "" }
                })
            ).status
        ).toBe(409)
        expect(
            (await app.request(`/api/drafts/${f.draftId}`, { method: "PATCH", headers: f.headers }))
                .status
        ).toBe(404)
        // Even another draft/job belonging to this project cannot publish again.
        const secondDraft = crypto.randomUUID(),
            secondJob = crypto.randomUUID()
        const originalJob = (await repo.get("job", (await repo.get("draft", f.draftId))!.jobId))!
        await repo.save("job", {
            ...originalJob,
            id: secondJob,
            idempotencyKey: crypto.randomUUID()
        })
        await repo.save("draft", {
            ...draft,
            id: secondDraft,
            jobId: secondJob,
            reviewStatus: "READY_FOR_REVIEW"
        })
        expect(
            (
                await request(app, `/api/drafts/${secondDraft}/publications`, {
                    method: "POST",
                    headers: { ...f.headers, "Idempotency-Key": crypto.randomUUID() },
                    body: f.payload
                })
            ).status
        ).toBe(409)
    })
    test("reject and publish serialize their decision and never both succeed", async () => {
        const f = await fixture(),
            draft = (await repo.get("draft", f.draftId))!
        const results = await Promise.all([
            f.enqueue(),
            request(app, `/api/drafts/${f.draftId}/reject`, {
                method: "POST",
                headers: f.headers,
                body: {
                    contentHash: draft.contentHash,
                    notes: "Rejected"
                }
            })
        ])
        expect(results.filter((r) => r.status === 200 || r.status === 202)).toHaveLength(1)
        expect(results.filter((r) => r.status === 409)).toHaveLength(1)
        const state = (await repo.get("draft", f.draftId))!.reviewStatus
        expect(["PUBLISH", "REJECTED"]).toContain(state)
        expect(await repo.find("publication", { batchId: f.batchId })).toHaveLength(
            state === "PUBLISH" ? 1 : 0
        )
    })
    test("rejects rejected, stale, unauthorized media permission and outdated design", async () => {
        const f = await fixture()
        await repo.save("draft", { id: f.draftId, reviewStatus: "REJECTED" })
        expect((await f.enqueue()).status).toBe(409)
        await repo.save("draft", { id: f.draftId, reviewStatus: "READY_FOR_REVIEW" })
        expect(
            (await f.enqueue({ ...f.payload, expectedContentHash: "b".repeat(64) })).status
        ).toBe(409)
        await repo.save("batch", { id: f.batchId, publicationPermission: false })
        expect((await f.enqueue()).status).toBe(400)
        await repo.save("batch", { id: f.batchId, publicationPermission: true })
        expect((await f.enqueue({ ...f.payload, source: "design" })).status).toBe(400)
        expect(await repo.find("publication", { draftId: f.draftId })).toHaveLength(0)
    })
    test("publish atomically saves final edits and rejects invalid content or foreign photos", async () => {
        const f = await fixture()
        expect(
            (await f.enqueue({ ...f.payload, content: { ...f.payload.content, title: "" } })).status
        ).toBe(422)
        expect(
            (
                await f.enqueue({
                    ...f.payload,
                    content: { ...f.payload.content, primaryAssetId: crypto.randomUUID() }
                })
            ).status
        ).toBe(400)
        expect((await repo.get("draft", f.draftId))!.caption).toBe(f.payload.content.caption)
        expect(await repo.find("publication", { draftId: f.draftId })).toHaveLength(0)
        const finalContent = {
            ...f.payload.content,
            title: "Final title",
            caption: "Ready to post",
            hashtags: ["#Final"]
        }
        const response = await f.enqueue({ ...f.payload, content: finalContent })
        expect(response.status).toBe(202)
        expect(response.body.data.caption).toBe("Ready to post\n\n#Final")
        const saved = (await repo.get("draft", f.draftId))!
        expect(saved.caption).toBe("Ready to post")
        expect(saved.contentHash).toBe(contentHash(finalContent))
        expect(saved.reviewStatus).toBe("PUBLISH")
    })
    test("media preparation failure leaves content ready and unchanged", async () => {
        const f = await fixture()
        const prepare = spyOn(publicationMedia, "prepare").mockRejectedValueOnce(
            new Error("storage unavailable")
        )
        try {
            expect(
                (
                    await f.enqueue({
                        ...f.payload,
                        content: { ...f.payload.content, caption: "Not saved" }
                    })
                ).status
            ).toBe(500)
            const saved = (await repo.get("draft", f.draftId))!
            expect(saved.caption).toBe(f.payload.content.caption)
            expect(saved.reviewStatus).toBe("READY_FOR_REVIEW")
            expect(await repo.find("publication", { draftId: f.draftId })).toHaveLength(0)
        } finally {
            prepare.mockRestore()
        }
    })
    test("design publishing requires the unchanged AI content and matching render", async () => {
        const f = await fixture()
        const draft = (await repo.get("draft", f.draftId))!
        const asset = (await repo.get("asset", draft.primaryAssetId))!
        const resultId = crypto.randomUUID()
        await repo.save("aiResult", {
            id: resultId,
            jobId: draft.jobId,
            executionId: "test",
            resultVersion: 1,
            rankings: [],
            selectedAssetIds: [asset.id],
            rawTitle: draft.title,
            rawCaption: draft.caption,
            rawHashtags: draft.hashtags,
            rawPayloadHash: "a".repeat(64)
        })
        await repo.save("render", {
            id: crypto.randomUUID(),
            aiResultId: resultId,
            assetId: asset.id,
            placement: "feed",
            format: "jpeg",
            width: 24,
            height: 40,
            storageKey: asset.safePreviewStorageKey,
            renderState: "READY"
        })
        expect(
            (
                await f.enqueue({
                    ...f.payload,
                    source: "design",
                    content: { ...f.payload.content, caption: "Edited" }
                })
            ).status
        ).toBe(400)
        expect(
            (await f.enqueue({ ...f.payload, source: "design", placement: "story" })).status
        ).toBe(400)
        const response = await f.enqueue({ ...f.payload, source: "design" })
        expect(response.status).toBe(202)
        expect(response.body.data.source).toBe("design")
    })
    test("schedule stays queued until due and can be cancelled without calling Meta", async () => {
        const f = await fixture()
        expect(
            (
                await f.enqueue({
                    ...f.payload,
                    scheduledAt: new Date(Date.now() - 1000).toISOString()
                } as any)
            ).status
        ).toBe(400)
        const result = await f.enqueue({
            ...f.payload,
            scheduledAt: new Date(Date.now() + 3600000).toISOString()
        } as any)
        expect(result.status).toBe(202)
        const api = new FakeGraph()
        await worker(api).tick()
        expect(api.creates).toBe(0)
        const id = result.body.data.id
        const cancelled = await request(app, `/api/publications/${id}/cancel`, {
            method: "POST",
            headers: f.headers
        })
        expect(cancelled.body.data.status).toBe("CANCELLED")
        expect((await repo.get("draft", f.draftId))!.reviewStatus).toBe("REJECTED")
        expect((await f.enqueue()).status).toBe(409)
        expect(
            (
                await request(app, `/api/publications/${id}/retry`, {
                    method: "POST",
                    headers: f.headers
                })
            ).status
        ).toBe(409)
    })
    test("two workers cannot publish the same job twice; optional permalink errors retain success", async () => {
        const f = await fixture()
        const row = (await f.enqueue()).body.data
        const api = new FakeGraph()
        api.failLink = true
        await Promise.all([worker(api).process(row.id), worker(api).process(row.id)])
        expect(api.creates).toBe(1)
        await due(row.id)
        await Promise.all([worker(api).process(row.id), worker(api).process(row.id)])
        expect(api.publishes).toBe(1)
        const saved = await repo.get("publication", row.id)
        expect(saved!.status).toBe("PUBLISHED")
        expect(saved!.mediaId).toBe("456")
        expect(
            (
                await request(app, `/api/publications/${row.id}/retry`, {
                    method: "POST",
                    headers: f.headers
                })
            ).status
        ).toBe(409)
    })
    test("ambiguous publish is reconciled after restart without a second publish request", async () => {
        const f = await fixture()
        const id = (await f.enqueue()).body.data.id
        const api = new FakeGraph()
        api.ambiguous = true
        await worker(api).process(id)
        await due(id)
        await worker(api).process(id)
        expect((await repo.get("publication", id))!.status).toBe("UNKNOWN")
        await due(id)
        await worker(api).process(id)
        expect(api.publishes).toBe(1)
        api.state = "PUBLISHED"
        await due(id)
        await worker(api).process(id)
        expect((await repo.get("publication", id))!.status).toBe("PUBLISHED")
        expect(api.publishes).toBe(1)
    })
    test("known pre-publish failure is retryable on the same publication record", async () => {
        const f = await fixture()
        const id = (await f.enqueue()).body.data.id
        const api = new FakeGraph()
        api.createFailure = true
        await worker(api).process(id)
        expect((await repo.get("publication", id))!.status).toBe("FAILED")
        expect(
            (
                await request(app, `/api/publications/${id}/retry`, {
                    method: "POST",
                    headers: f.headers
                })
            ).body.data.status
        ).toBe("QUEUED")
        api.createFailure = false
        await worker(api).process(id)
        await due(id)
        await worker(api).process(id)
        expect((await repo.get("publication", id))!.status).toBe("PUBLISHED")
    })
})
