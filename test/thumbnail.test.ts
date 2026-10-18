import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { ThumbnailService } from '../src/modules/content/media/thumbnail.service'

test('thumbnails preserve ratio, persist once and share concurrent generation', async () => {
    const source = await sharp({ create: { width: 120, height: 60, channels: 3, background: '#123456' } }).jpeg().toBuffer()
    const objects = new Map<string, Buffer>([['preview', source]])
    let writes = 0
    const service = new ThumbnailService({
        get: async key => {
            const data = objects.get(key)
            if (!data) throw Object.assign(new Error('missing'), { code: 'NotFound' })
            return data
        },
        put: async (key, data) => { writes++; objects.set(key, data) },
        signedUrl: async key => `https://storage.test/${key}?signature=test`,
        remove: async () => {}
    })
    const [first, second] = await Promise.all([service.previews('preview', 'thumbnail'), service.previews('preview', 'thumbnail')])
    expect(first).toEqual(second)
    expect(writes).toBe(1)
    const metadata = await sharp(objects.get('thumbnail')!).metadata()
    expect([metadata.width, metadata.height, metadata.format]).toEqual([32, 16, 'jpeg'])
    await service.previews('preview', 'thumbnail')
    expect(writes).toBe(1)
})

test('storage outages are not mistaken for missing thumbnails', async () => {
    let writes = 0
    const service = new ThumbnailService({
        get: async () => { throw new Error('storage unavailable') },
        put: async () => { writes++ }, signedUrl: async () => '', remove: async () => {}
    })
    await expect(service.previews('preview', 'thumbnail')).rejects.toThrow('storage unavailable')
    expect(writes).toBe(0)
})
