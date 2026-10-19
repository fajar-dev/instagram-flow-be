import { expect, test } from 'bun:test'
import { PublicationMediaService } from '../src/modules/publishing/publication-media.service'
import type { IContentMedia } from '../src/modules/content/media/interfaces/content-media.interface'

test('publication uses the existing object storage signed URL for both HTTP and HTTPS', async () => {
    for (const protocol of ['http', 'https']) {
        const signedUrl = `${protocol}://storage.example/image.jpg?signature=private`
        const service = new PublicationMediaService({ signedUrl: async (_key: string, expiry: number) => {
            expect(expiry).toBe(3600)
            return signedUrl
        } } as IContentMedia)
        expect(await service.url('publications/test.jpg')).toBe(signedUrl)
    }
    const service = new PublicationMediaService({ signedUrl: async () => 'file:///tmp/image.jpg' } as unknown as IContentMedia)
    await expect(service.url('publications/test.jpg')).rejects.toThrow('public HTTP or HTTPS')
})
