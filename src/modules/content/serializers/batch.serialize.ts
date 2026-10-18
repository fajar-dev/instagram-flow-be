import type { Batch } from '../entities/batch.entity';

type PublicFields = Pick<Batch, 'id' | 'uploaderId' | 'projectName' | 'activity' | 'location' | 'documentationDate' | 'description' | 'clientName' | 'publicationPermission' | 'consentBy' | 'consentAt' | 'status' | 'createdAt' | 'updatedAt'>;

export class BatchSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            uploaderId: value.uploaderId,
            projectName: value.projectName,
            activity: value.activity,
            location: value.location,
            documentationDate: value.documentationDate,
            description: value.description,
            clientName: value.clientName,
            publicationPermission: value.publicationPermission,
            consentBy: value.consentBy,
            consentAt: value.consentAt,
            status: value.status,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt,
        };
    }

    static collection(values: PublicFields[]) {
        return values.map(value => this.single(value));
    }
}
