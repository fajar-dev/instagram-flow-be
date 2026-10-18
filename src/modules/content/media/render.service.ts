import { config } from '../../../config/config'
import { BadRequestException } from '../../../core/exceptions/base'
import { logger } from '../../../core/helpers/logger'
import { sanitizeSvg } from './adapters/svg-sanitizer'
import type { IContentMedia } from './interfaces/content-media.interface'
import type { Asset } from './entities/asset.entity'
import type { ResultInput } from '../../ai-job/workflow/validators/workflow.validator'
import { id } from '../../shared/workflow.helpers'

/** Sanitizes and stores render bytes; database orchestration belongs to the workflow service. */
export class RenderService {
    constructor(private readonly media: IContentMedia) {}

    async create(renders: ResultInput['renders'], assets: Asset[], outputs: string[], primaryAssetId: string, aiResultId: string, storedKeys: string[]) {
        const safeRenders = [];
        for (const render of renders) {
            if (!outputs.includes(render.placement) || render.assetId !== primaryAssetId || render.height !== (render.placement === 'story' ? 1920 : 1350))
                throw new BadRequestException('Invalid render placement or primary asset');
            const asset = assets.find(a => a.id === render.assetId)!;
            const bytes = await this.media.get(asset.safePreviewStorageKey);
            const expectedUrl = new URL(await this.media.signedUrl(asset.safePreviewStorageKey, config.media.signedTtl));
            const sanitizedSvg = sanitizeSvg(render.svg, bytes, (source) => {
                try {
                    const url = new URL(source);
                    return url.origin === expectedUrl.origin && url.pathname === expectedUrl.pathname;
                }
                catch {
                    return false;
                }
            });
            const renderId = id();
            const storageKey = `renders/${renderId}.svg`;
            storedKeys.push(storageKey);
            await this.media.put(storageKey, Buffer.from(sanitizedSvg));
            safeRenders.push({
                id: renderId, aiResultId, placement: render.placement, format: render.format, width: render.width, height: render.height, assetId: asset.id, storageKey, renderState: 'SVG_PREVIEW'
            });
        }
        return safeRenders;
    }

    async cleanup(keys: string[]) {
        const results = await Promise.allSettled(keys.map(key => this.media.remove(key)))
        if (results.some(result => result.status === 'rejected')) {
            logger.warn('Rolled back render objects require cleanup', { keys })
        }
    }
}
