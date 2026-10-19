import sharp from 'sharp'
import type { IContentMedia } from '../content/media/interfaces/content-media.interface'
import { BadRequestException } from '../../core/exceptions/base'

export class PublicationMediaService {
    constructor(private readonly media: IContentMedia) {}
    async prepare(sourceKey: string, placement: 'feed' | 'story', publicationGroupId: string) {
        const source = await this.media.get(sourceKey)
        const buffer = await sharp(source, { limitInputPixels: 40000000 }).rotate()
            .resize(1080, placement === 'story' ? 1920 : 1350, { fit: 'contain', background: '#ffffff' })
            .flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer()
        if (buffer.length > 8 * 1024 * 1024) throw new BadRequestException('Publication image exceeds size limit')
        const key = `publications/${publicationGroupId}.jpg`
        await this.media.put(key, buffer)
        return key
    }
    async url(key: string) {
        const value = await this.media.signedUrl(key, 3600)
        const url = new URL(value)
        if (!['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('Publishing requires a public HTTP or HTTPS object storage endpoint')
        return value
    }
    async remove(key: string) { await this.media.remove(key) }
    async read(key: string) { return this.media.get(key) }
}
