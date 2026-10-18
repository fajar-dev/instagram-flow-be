import type { Revision } from '../entities/revision.entity';

type PublicFields = Pick<Revision, 'id' | 'draftId' | 'revisionNo' | 'primaryAssetId' | 'title' | 'caption' | 'hashtags' | 'location' | 'activity' | 'contentHash' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export class RevisionSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            draftId: value.draftId,
            revisionNo: value.revisionNo,
            primaryAssetId: value.primaryAssetId,
            title: value.title,
            caption: value.caption,
            hashtags: value.hashtags,
            location: value.location,
            activity: value.activity,
            contentHash: value.contentHash,
            createdBy: value.createdBy,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt,
        };
    }

    static collection(values: PublicFields[]) {
        return values.map(value => this.single(value));
    }
}
