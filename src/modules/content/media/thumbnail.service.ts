import sharp from 'sharp';
import { config } from '../../../config/config';
import type { IContentMedia } from './interfaces/content-media.interface';

/** Small persistent placeholders share the existing private object-storage bucket. */
export class ThumbnailService {
    private readonly pending = new Map<string, Promise<void>>();
    constructor(private readonly media: IContentMedia) {}

    async previews(previewKey: string, thumbnailKey: string) {
        let pending = this.pending.get(thumbnailKey);
        if (!pending) {
            pending = this.ensure(previewKey, thumbnailKey).finally(() => this.pending.delete(thumbnailKey));
            this.pending.set(thumbnailKey, pending);
        }
        await pending;
        const [previewUrl, thumbnailUrl] = await Promise.all([
            this.media.signedUrl(previewKey, config.media.signedTtl),
            this.media.signedUrl(thumbnailKey, config.media.signedTtl)
        ]);
        return { previewUrl, thumbnailUrl };
    }

    private async ensure(previewKey: string, thumbnailKey: string) {
        try {
            await this.media.get(thumbnailKey);
            return;
        } catch (error) {
            if (!['NoSuchKey', 'NotFound'].includes((error as { code?: string }).code || '')) throw error;
        }
        const preview = await this.media.get(previewKey);
        const thumbnail = await sharp(preview).resize({ width: 32, height: 32, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 45 }).toBuffer();
        await this.media.put(thumbnailKey, thumbnail);
    }
}
