import { AssetSerializer } from '../src/modules/content/media/serializers/asset.serialize'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import sharp from 'sharp'
import { initTestDatabase, destroyTestDatabase, cleanTestDatabase, createTestApp, registerAndLogin, request } from './setup'
import { AppDataSource } from '../src/config/database'
import { User } from '../src/modules/user/entities/user.entity'
import { config } from '../src/config/config'
import { TypeOrmWorkflowRepository } from '../src/modules/shared/repositories/workflow.repository'
import { createTestWorkflow } from './fixtures/workflow.module'
import { JobDispatcher } from '../src/modules/ai-job/dispatch.service'
import { fromLegacy, toLegacy } from '../src/modules/ai-job/workflow/adapters/n8n.adapter'
import { sanitizeSvg } from '../src/modules/content/media/adapters/svg-sanitizer'
import { workflowEntityMap } from '../src/modules/shared/entities'
import { createBatchData } from './helpers'
let app: Hono
const originalConfig = { n8n: { ...config.n8n }, media: { ...config.media }, minio: { ...config.minio } }
const originalUrl = config.app.appUrl
beforeAll(async () => {
    config.n8n.webhookUrl = 'https://workflow.test/hook'
    config.n8n.webhookToken = 'test-webhook-token'
    config.n8n.serviceToken = 'test-service-token'
    config.minio.accessKey = 'test-access-key'
    config.minio.secretKey = 'test-storage-secret'
    config.n8n.contract = 'legacy'
    config.app.appUrl = 'https://api.test'
    await initTestDatabase()
    app = createTestApp()
})
beforeEach(cleanTestDatabase)
afterAll(async () => { await destroyTestDatabase(); Object.assign(config.n8n, originalConfig.n8n); Object.assign(config.media, originalConfig.media); Object.assign(config.minio, originalConfig.minio); config.app.appUrl = originalUrl })
const serviceHeaders = { Authorization: 'Bearer test-service-token' }
const metadata = createBatchData()
async function actor(email: string) {
    const session = await registerAndLogin(app, { name: 'Content test', email, password: 'password123' })
    return { ...session, user: (await AppDataSource.getRepository(User).findOneBy({ id: session.user.id }))! }
}
async function batch(headers: Record<string, string>) {
    return (await request(app, '/api/batches', { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: metadata })).body.data
}
async function upload(batchId: string, headers: Record<string, string>, bytes?: Buffer, type = 'image/png') {
    const data = bytes || await sharp({ create: { width: 20, height: 30, channels: 3, background: '#334455' } }).png().toBuffer()
    const form = new FormData()
    form.append('file', new File([new Uint8Array(data)], 'photo.png', { type }))
    const response = await app.request(`/api/batches/${batchId}/assets`, { method: 'POST', headers, body: form })
    return { status: response.status, body: await response.json() as any }
}
async function queued(headers: Record<string, string>) {
    const b = await batch(headers)
    const a = (await upload(b.id, headers)).body.data
    const response = await request(app, `/api/batches/${b.id}/process`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: { requestedOutputs: ['feed'] } })
    expect(response.status).toBe(202)
    const jobId = response.body.data.jobId
    const dispatch = (await AppDataSource.getRepository(workflowEntityMap.dispatch).findOneBy({ jobId }))!
    return { batchId: b.id, assetId: a.id, jobId, eventId: dispatch.eventId }
}
function result(job: { jobId: string; assetId: string; batchId: string }) {
    return { jobId: job.jobId, executionId: '42', resultVersion: 1, status: 'READY_FOR_REVIEW', selectedAssetIds: [job.assetId], rankings: [{ assetId: job.assetId, score: 90, reason: 'Sharp image' }], title: 'Monitoring', caption: 'Sensor installation', hashtags: ['#AMTI'], renders: [{ placement: 'feed', format: 'svg', width: 1080, height: 1350, assetId: job.assetId, svg: `<svg xmlns="http://www.w3.org/2000/svg"><image href="http://storage.test/${config.minio.bucket}/batches/${job.batchId}/preview/${job.assetId}.jpg?signature=test"/></svg>` }] }
}
async function claim(job: { jobId: string; eventId: string }) { return request(app, `/api/jobs/${job.jobId}/claim`, { method: 'POST', headers: serviceHeaders, body: { execution_id: '42', event_id: job.eventId } }) }

describe('Content workflow', () => {
    test('content counts require authentication and follow draft status without double counting ready jobs', async () => {
        expect((await request(app, '/api/content/counts')).status).toBe(401)
        const user = await actor('counts@example.com')
        const counts = async () => (await request(app, '/api/content/counts?days=30', { headers: user.headers })).body.data
        expect(Object.values(await counts()).every(value => value === 0)).toBe(true)
        expect((await request(app, '/api/content/counts?days=0', { headers: user.headers })).status).toBe(422)
        const job = await queued(user.headers)
        expect((await counts()).QUEUED).toBe(1)
        await claim(job)
        expect((await counts()).PROCESSING).toBe(1)
        await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(result(job)) })
        expect((await counts()).READY_FOR_REVIEW).toBe(1)
        const detail = (await request(app, `/api/jobs/${job.jobId}`, { headers: user.headers })).body.data
        await request(app, `/api/drafts/${detail.draft.id}/review`, { method: 'POST', headers: user.headers, body: {
            revisionId: detail.revision.id, contentHash: detail.revision.contentHash, decision: 'APPROVED_INTERNAL', notes: ''
        } })
        expect((await counts()).READY_FOR_REVIEW).toBe(0)
        expect((await counts()).APPROVED_INTERNAL).toBe(1)
        const listed = await request(app, '/api/review?status=APPROVED_INTERNAL&days=30', { headers: user.headers })
        expect(listed.body.meta.total).toBe((await counts()).APPROVED_INTERNAL)
        await AppDataSource.getRepository(workflowEntityMap.draft).update(detail.draft.id, { createdAt: new Date(Date.now() - 31 * 86400000) })
        expect((await counts()).APPROVED_INTERNAL).toBe(0)
    })
    test('gallery previews authorize access and backfill private thumbnails for existing assets', async () => {
        const user = await actor('gallery@example.com')
        const b = await batch(user.headers)
        const asset = (await upload(b.id, user.headers)).body.data
        expect((await request(app, `/api/assets/${asset.id}/previews`)).status).toBe(401)
        const preview = await request(app, `/api/assets/${asset.id}/previews`, { headers: user.headers })
        expect(preview.status).toBe(200)
        expect(preview.body.data.thumbnailUrl).toContain(`/thumbnail/${asset.id}.jpg?signature=`)
        expect(preview.body.data.previewUrl).toContain(`/preview/${asset.id}.jpg?signature=`)
        expect((await request(app, `/api/assets/${asset.id}/previews`, { headers: user.headers })).status).toBe(200)
        await request(app, `/api/assets/${asset.id}`, { method: 'DELETE', headers: user.headers })
        expect((await request(app, `/api/assets/${asset.id}/previews`, { headers: user.headers })).status).toBe(404)
    })
    test('batch idempotency rejects different metadata and preserves original consent', async () => {
        const user = await actor('idempotency@example.com')
        const headers = { ...user.headers, 'Idempotency-Key': crypto.randomUUID() }
        const first = await request(app, '/api/batches', { method: 'POST', headers, body: metadata })
        const duplicate = await request(app, '/api/batches', { method: 'POST', headers, body: metadata })
        expect(duplicate.body.data.id).toBe(first.body.data.id)
        expect((await request(app, '/api/batches', { method: 'POST', headers, body: { ...metadata, projectName: 'Different project' } })).status).toBe(409)
    })
    test('enabled dispatcher does not send when deployment configuration becomes invalid', async () => {
        const user = await actor('paused-dispatch@example.com')
        const job = await queued(user.headers)
        const repository = new TypeOrmWorkflowRepository()
        await repository.save('setting', { id: crypto.randomUUID(), key: 'dispatch', nonSecretValue: { enabled: true }, updatedBy: user.user.id })
        let calls = 0
        const service = createTestWorkflow(repository, { signedUrl: async key => `http://storage.test/${config.minio.bucket}/${key}`, get: async () => Buffer.from(''), put: async () => {}, remove: async () => {} }, { send: async () => { calls++; return 202 } })
        const original = config.minio.secretKey
        try {
            config.minio.secretKey = ''
            await service.dispatcher.tick()
            expect(calls).toBe(0)
            expect((await repository.get('job', job.jobId))!.status).toBe('QUEUED')
        } finally { config.minio.secretKey = original }
    })

    test('watchdog fails abandoned execution and rejects its late result', async () => {
        const user = await actor('timeout@example.com')
        const job = await queued(user.headers)
        await claim(job)
        await AppDataSource.getRepository(workflowEntityMap.job).update(job.jobId, { startedAt: new Date(0) })
        const repository = new TypeOrmWorkflowRepository()
        const service = createTestWorkflow(repository, { signedUrl: async key => `http://storage.test/${config.minio.bucket}/${key}`, get: async () => Buffer.from(''), put: async () => {}, remove: async () => {} }, { send: async () => 202 })
        await new JobDispatcher(repository, service.context, service.settings, { send: async () => 202 }).tick()
        expect((await repository.get('job', job.jobId))!.errorCode).toBe('PROCESSING_TIMEOUT')
        expect((await repository.get('batch', job.batchId))!.status).toBe('FAILED')
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(result(job)) })).status).toBe(409)
    })
    test('all authenticated users share access while anonymous media stays private', async () => {
        const owner = await actor('owner@example.com')
        const other = await actor('other@example.com')
        const b = await batch(owner.headers)
        expect((await request(app, `/api/batches/${b.id}`, { headers: other.headers })).status).toBe(200)
        expect((await request(app, '/api/user', { headers: owner.headers })).status).toBe(200)
        expect((await request(app, '/api/settings', { headers: owner.headers })).status).toBe(200)
        const a = (await upload(b.id, owner.headers)).body.data
        expect(a.originalStorageKey).toBeUndefined()
        expect((await app.request(`/api/assets/${a.id}/download`)).status).toBe(401)
        expect((await app.request(`/api/assets/${a.id}/preview`, { headers: other.headers })).status).toBe(200)
        const media = (await request(app, '/api/media', { headers: other.headers })).body.data
        expect(media).toHaveLength(1)
        expect(media[0].uploaderName).toBe(owner.user.name)
        expect(media[0].uploaderPhoto).toBeNull()
        await AppDataSource.getRepository(User).update(owner.user.id, { photo: 'users/uploader.jpg' })
        const updated = (await request(app, '/api/media', { headers: other.headers })).body.data[0]
        expect(updated.uploaderPhoto).toBe(`http://storage.test/${config.minio.bucket}/users/uploader.jpg?signature=test`)
        expect(updated.password).toBeUndefined()
    })
    test('object storage failure rolls back the result and cleans attempted render objects', async () => {
        const user = await actor('render-storage@example.com')
        const job = await queued(user.headers)
        await claim(job)
        const removed: string[] = []
        const repository = new TypeOrmWorkflowRepository()
        const preview = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#334455' } }).jpeg().toBuffer()
        const workflow = createTestWorkflow(repository, {
            get: async () => preview,
            signedUrl: async key => `http://storage.test/${config.minio.bucket}/${key}`,
            put: async () => { throw new Error('Object storage unavailable') },
            remove: async key => { removed.push(key) },
        }, { send: async () => 202 })
        await expect(workflow.workflow.result(job.jobId, result(job) as any)).rejects.toThrow('Object storage unavailable')
        expect(removed).toHaveLength(1)
        expect(removed[0]).toMatch(/^renders\/.*\.svg$/)
        expect((await repository.get('job', job.jobId))!.status).toBe('PROCESSING')
        expect(await repository.find('aiResult', { jobId: job.jobId })).toHaveLength(0)
    })
    test('invalid images rejected and immutable originals separated from sanitized previews', async () => {
        const user = await actor('upload@example.com')
        const b = await batch(user.headers)
        expect((await upload(b.id, user.headers, Buffer.from('<svg/>'))).status).toBe(400)
        const a = await upload(b.id, user.headers)
        expect(a.status).toBe(200)
        const preview = await app.request(`/api/assets/${a.body.data.id}/preview`, { headers: user.headers })
        expect(preview.headers.get('Content-Type')).toBe('image/jpeg')
        const decoded = await sharp(Buffer.from(await preview.arrayBuffer())).metadata()
        expect(decoded.exif).toBeUndefined()
    })
    test('upload and legacy processing limits reject excess images explicitly', async () => {
        const user = await actor('limits@example.com')
        const b = await batch(user.headers)
        expect((await upload(b.id, user.headers, Buffer.alloc(15 * 1024 * 1024 + 1))).status).toBe(400)
        const a = (await upload(b.id, user.headers)).body.data
        const repo = AppDataSource.getRepository(workflowEntityMap.asset)
        const stored = (await repo.findOneBy({ id: a.id }))!
        for (let index = 1; index < 30; index++) await repo.save({ ...stored, id: crypto.randomUUID(), sha256: String(index).padStart(64, '0') })
        const bytes = await sharp({ create: { width: 21, height: 30, channels: 3, background: '#112233' } }).png().toBuffer()
        expect((await upload(b.id, user.headers, bytes)).status).toBe(400)
        const response = await request(app, `/api/batches/${b.id}/process`, { method: 'POST', headers: { ...user.headers, 'Idempotency-Key': crypto.randomUUID() }, body: { requestedOutputs: ['feed'] } })
        expect(response.status).toBe(400)
        expect(await AppDataSource.getRepository(workflowEntityMap.job).count()).toBe(0)
    })
    test('invalid image errors remain specific and do not prevent other batch uploads', async () => {
        const user = await actor('partial-upload@example.com')
        const b = await batch(user.headers)
        const first = await upload(b.id, user.headers)
        expect(first.status).toBe(200)
        const jpeg = await sharp({ create: { width: 20, height: 30, channels: 3, background: '#334455' } }).jpeg().toBuffer()
        const mismatch = await upload(b.id, user.headers, jpeg)
        expect(mismatch.status).toBe(400)
        expect(mismatch.body.message).toBe('Only static JPG, PNG and WEBP images are supported')
        const corrupt = await upload(b.id, user.headers, Buffer.from('not an image'))
        expect(corrupt.status).toBe(400)
        const other = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#abcdef' } }).png().toBuffer()
        expect((await upload(b.id, user.headers, other)).status).toBe(200)
        expect(await AppDataSource.getRepository(workflowEntityMap.asset).countBy({ batchId: b.id })).toBe(2)
    })
    test('concurrent process and claim are idempotent', async () => {
        const user = await actor('parallel@example.com')
        const b = await batch(user.headers)
        await upload(b.id, user.headers)
        const options = { method: 'POST', headers: { ...user.headers, 'Idempotency-Key': crypto.randomUUID() }, body: { requestedOutputs: ['feed'] } }
        const results = await Promise.all([request(app, `/api/batches/${b.id}/process`, options), request(app, `/api/batches/${b.id}/process`, options)])
        expect(results.map(r => r.status)).toEqual([202, 202])
        expect(results[0].body.data.jobId).toBe(results[1].body.data.jobId)
        const jobId = results[0].body.data.jobId
        const d = (await AppDataSource.getRepository(workflowEntityMap.dispatch).findOneBy({ jobId }))!
        const claims = await Promise.all([claim({ jobId, eventId: d.eventId }), request(app, `/api/jobs/${jobId}/claim`, { method: 'POST', headers: serviceHeaders, body: { execution_id: '43', event_id: d.eventId } })])
        expect(claims.filter(r => r.body.claimed)).toHaveLength(1)
        const owner = claims[0].body.claimed ? '42' : '43'
        const replay = await request(app, `/api/jobs/${jobId}/claim`, { method: 'POST', headers: serviceHeaders, body: { execution_id: owner, event_id: d.eventId } })
        expect(replay.body.claimed).toBe(true)
    })
    test('legacy callback, signed manifest, revisions and stale approval', async () => {
        const user = await actor('review@example.com')
        const job = await queued(user.headers)
        await claim(job)
        expect((await request(app, `/api/jobs/${job.jobId}/manifest`, { headers: user.headers })).status).toBe(401)
        const manifest = await request(app, `/api/jobs/${job.jobId}/manifest`, { headers: serviceHeaders })
        expect(manifest.body.assets[0].asset_id).toBe(job.assetId)
        expect(manifest.body.review_url).toBe(`${config.app.frontendUrl}/content/${job.jobId}/edit`)
        const signed = new URL(manifest.body.assets[0].ai_image_url)
        expect(signed.origin).toBe('http://storage.test')
        expect(signed.pathname).toBe(`/${config.minio.bucket}/batches/${job.batchId}/preview/${job.assetId}.jpg`)
        expect(manifest.body.assets[0].render_image_url).toBe(manifest.body.assets[0].ai_image_url)
        expect((await app.request(`/api/media-access/${job.assetId}`)).status).toBe(404)
        const payload = toLegacy(result(job))
        const post = () => request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: payload })
        expect((await post()).status).toBe(200)
        expect((await post()).body.duplicate).toBe(true)
        await request(app, `/api/jobs/${job.jobId}/failure`, { method: 'POST', headers: serviceHeaders, body: { execution_id: '42', stage: 'TELEGRAM', error_code: 'NOTIFICATION', safe_message: 'Failed', retryable: false } })
        expect((await AppDataSource.getRepository(workflowEntityMap.job).findOneBy({ id: job.jobId }))!.status).toBe('READY_FOR_REVIEW')
        let detail = (await request(app, `/api/jobs/${job.jobId}`, { headers: user.headers })).body.data
        expect(detail.renders[0].sanitizedSvg).toBeUndefined()
        const svg = await (await app.request(`/api/renders/${detail.renders[0].id}`, { headers: user.headers })).text()
        expect(svg).toContain('data:image/jpeg;base64,')
        expect(svg).not.toContain('token=')
        const approval = { revisionId: detail.revision.id, contentHash: detail.revision.contentHash, decision: 'APPROVED_INTERNAL', notes: 'Checked' }
        expect((await request(app, `/api/drafts/${detail.draft.id}/review`, { method: 'POST', headers: user.headers, body: approval })).status).toBe(200)
        const current = detail.revision
        expect((await request(app, `/api/drafts/${detail.draft.id}`, { method: 'PATCH', headers: user.headers, body: { expectedRevisionId: current.id, primaryAssetId: job.assetId, title: 'Edited title', caption: current.caption, hashtags: current.hashtags, location: current.location, activity: current.activity } })).status).toBe(200)
        expect((await request(app, `/api/drafts/${detail.draft.id}/review`, { method: 'POST', headers: user.headers, body: approval })).status).toBe(409)
        detail = (await request(app, `/api/jobs/${job.jobId}`, { headers: user.headers })).body.data
        expect(detail.draft.reviewStatus).toBe('READY_FOR_REVIEW')
        expect(detail.renders[0].renderState).toBe('OUTDATED')
        expect(detail.revisions).toHaveLength(2)
    })
    test('wrong execution, partial ranking and malicious SVG cannot finalize a job', async () => {
        const user = await actor('badcallback@example.com')
        const job = await queued(user.headers)
        await claim(job)
        const value = result(job)
        value.executionId = '43'
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(value) })).status).toBe(409)
        value.executionId = '42'
        value.selectedAssetIds = [crypto.randomUUID()]
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(value) })).status).toBe(400)
        value.selectedAssetIds = [job.assetId]
        value.renders[0].height = 1920
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(value) })).status).toBe(400)
        value.renders[0].height = 1350
        value.renders[0].svg = '<svg><script>alert(1)</script></svg>'
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(value) })).status).toBe(400)
        expect(await AppDataSource.getRepository(workflowEntityMap.aiResult).count()).toBe(0)
    })
    test('failure redacts arbitrary text and retry has a new job identity', async () => {
        const user = await actor('retry@example.com')
        const job = await queued(user.headers)
        await claim(job)
        const failure = { execution_id: '42', stage: 'WORKFLOW', error_code: 'ERROR', safe_message: 'secret=private-password https://private', retryable: true }
        await request(app, `/api/jobs/${job.jobId}/failure`, { method: 'POST', headers: serviceHeaders, body: failure })
        const detail = await request(app, `/api/jobs/${job.jobId}`, { headers: user.headers })
        expect(JSON.stringify(detail.body)).not.toContain('private-password')
        const retry = await request(app, `/api/jobs/${job.jobId}/retry`, { method: 'POST', headers: { ...user.headers, 'Idempotency-Key': crypto.randomUUID() } })
        expect(retry.status).toBe(202)
        expect(retry.body.data.jobId).not.toBe(job.jobId)
        expect((await request(app, `/api/jobs/${job.jobId}/result`, { method: 'POST', headers: serviceHeaders, body: toLegacy(result(job)) })).status).toBe(409)
    })
    test('archived assets do not consume the active photo limit', async () => {
        const user = await actor('archived-limit@example.com')
        const b = await batch(user.headers)
        const originalLimit = config.media.maxBatchFiles
        config.media.maxBatchFiles = 1
        try {
            const first = await upload(b.id, user.headers)
            expect(first.status).toBe(200)
            expect((await request(app, `/api/assets/${first.body.data.id}`, { method: 'DELETE', headers: user.headers })).status).toBe(200)
            const second = await upload(b.id, user.headers)
            expect(second.status).toBe(200)
            expect(second.body.data.id).not.toBe(first.body.data.id)
        } finally { config.media.maxBatchFiles = originalLimit }
    })
    test('non-retryable failures cannot enqueue another job', async () => {
        const user = await actor('nonretry@example.com')
        const job = await queued(user.headers)
        await claim(job)
        await request(app, `/api/jobs/${job.jobId}/failure`, { method: 'POST', headers: serviceHeaders, body: { execution_id: '42', stage: 'WORKFLOW', error_code: 'INVALID', safe_message: 'Invalid input', retryable: false } })
        const retry = await request(app, `/api/jobs/${job.jobId}/retry`, { method: 'POST', headers: { ...user.headers, 'Idempotency-Key': crypto.randomUUID() } })
        expect(retry.status).toBe(409)
        expect(await AppDataSource.getRepository(workflowEntityMap.job).countBy({ batchId: job.batchId })).toBe(1)
    })
    test('exhausted dispatch fails both job and batch, then retry queues a new job', async () => {
        const user = await actor('exhausted@example.com')
        const job = await queued(user.headers)
        const repository = new TypeOrmWorkflowRepository()
        await repository.save('setting', { id: crypto.randomUUID(), key: 'dispatch', nonSecretValue: { enabled: true }, updatedBy: user.user.id })
        const dispatch = (await repository.find('dispatch', { jobId: job.jobId }))[0]!
        await repository.save('dispatch', { ...dispatch, attemptNo: config.jobs.retryMax - 1 })
        const service = createTestWorkflow(repository, { signedUrl: async key => `http://storage.test/${config.minio.bucket}/${key}`, get: async () => Buffer.from(''), put: async () => {}, remove: async () => {} }, { send: async () => 503 })
        await service.dispatcher.tick()
        expect((await repository.get('dispatch', dispatch.id))!.status).toBe('FAILED')
        expect((await repository.get('job', job.jobId))!.status).toBe('FAILED')
        expect((await repository.get('batch', job.batchId))!.status).toBe('FAILED')
        const retry = await request(app, `/api/jobs/${job.jobId}/retry`, { method: 'POST', headers: { ...user.headers, 'Idempotency-Key': crypto.randomUUID() } })
        expect(retry.status).toBe(202)
        expect((await repository.get('batch', job.batchId))!.status).toBe('PROCESSING')
    })
    test('shared list validation rejects invalid pagination for baseline and feature routes', async () => {
        const user = await actor('pagination@example.com')
        for (const path of ['/api/contact', '/api/user', '/api/jobs']) {
            for (const query of ['page=-1', 'page=1.5', 'limit=101', 'limit=NaN']) {
                expect((await request(app, `${path}?${query}`, { headers: user.headers })).status).toBe(422)
            }
        }
    })
    test('dispatcher failure keeps job durable; claim racing ACK is not overwritten', async () => {
        const user = await actor('dispatch@example.com')
        const job = await queued(user.headers)
        await AppDataSource.getRepository(workflowEntityMap.setting).save({ id: crypto.randomUUID(), key: 'dispatch', nonSecretValue: { enabled: true }, updatedBy: user.user.id })
        const repository = new TypeOrmWorkflowRepository()
        const service = createTestWorkflow(repository, { signedUrl: async key => `http://storage.test/${config.minio.bucket}/${key}`, get: async () => Buffer.from(''), put: async () => {}, remove: async () => {} }, { send: async () => 202 })
        const failing = new JobDispatcher(repository, service.context, service.settings, { send: async () => { throw new Error('network') } })
        await failing.tick()
        const dispatch = (await repository.find('dispatch', { jobId: job.jobId }))[0]
        expect(dispatch.status).toBe('PENDING')
        expect((await repository.get('job', job.jobId))!.status).toBe('QUEUED')
        await repository.save('dispatch', { ...dispatch, nextRetryAt: new Date(0) })
        const success = new JobDispatcher(repository, service.context, service.settings, { send: async () => { await service.workflow.claim(job.jobId, '42', job.eventId); return 202 } })
        await success.tick()
        expect((await repository.get('job', job.jobId))!.status).toBe('PROCESSING')
    })
})

test('adapter preserves provider fields and actual V0.2 snake_case keys', () => {
    const fixture = { job_id: 'job_1', execution_id: '42', assets: [{ asset_id: 'asset_1', ai_image_url: 'https://example.test' }], model: 'model', messages: [] }
    expect(toLegacy(fromLegacy(fixture))).toEqual(fixture)
})
test('SVG disallows external fetch, scripts, entities and active attributes', () => {
    for (const svg of ['<svg><image href="http://127.0.0.1"/></svg>', '<svg onload="alert(1)"/>', '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>', '<svg><foreignObject/></svg>', '<svg><rect fill="url(http://private)"/></svg>']) {
        expect(() => sanitizeSvg(svg, Buffer.from(''), () => false)).toThrow()
    }
})


test('asset serializer never exposes storage paths or newly added private fields', () => {
    const asset = { id: 'asset', batchId: 'batch', mime: 'image/png', byteSize: 1, width: 1, height: 1, sha256: 'hash', deletedAt: null, createdAt: new Date(), updatedAt: new Date(), originalStorageKey: 'private/original', safePreviewStorageKey: 'private/preview', futureSecret: 'private-secret' }
    const serialized = AssetSerializer.single(asset)
    expect(serialized.id).toBe('asset')
    expect(serialized).not.toHaveProperty('originalStorageKey')
    expect(serialized).not.toHaveProperty('safePreviewStorageKey')
    expect(serialized).not.toHaveProperty('futureSecret')
})
