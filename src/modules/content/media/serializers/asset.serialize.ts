import type { Asset } from '../entities/asset.entity';

type PublicFields = Pick<Asset, 'id' | 'batchId' | 'mime' | 'byteSize' | 'width' | 'height' | 'sha256' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

export class AssetSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            batchId: value.batchId,
            mime: value.mime,
            byteSize: value.byteSize,
            width: value.width,
            height: value.height,
            sha256: value.sha256,
            deletedAt: value.deletedAt,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt,
        };
    }

    static collection(values: PublicFields[]) {
        return values.map(value => this.single(value));
    }
}
