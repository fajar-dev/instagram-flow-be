import type { Job } from '../entities/job.entity';

type PublicFields = Pick<Job, 'id' | 'batchId' | 'requestedOutputs' | 'status' | 'attemptNo' | 'lastExecutionId' | 'startedAt' | 'completedAt' | 'errorCode' | 'safeError' | 'retryable' | 'retryOfJobId' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export class JobSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            batchId: value.batchId,
            requestedOutputs: value.requestedOutputs,
            status: value.status,
            attemptNo: value.attemptNo,
            lastExecutionId: value.lastExecutionId,
            startedAt: value.startedAt,
            completedAt: value.completedAt,
            errorCode: value.errorCode,
            safeError: value.safeError,
            retryable: value.retryable,
            retryOfJobId: value.retryOfJobId,
            createdBy: value.createdBy,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt,
        };
    }

    static collection(values: PublicFields[]) {
        return values.map(value => this.single(value));
    }
}
