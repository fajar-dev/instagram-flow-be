import { NotFoundException } from '../../core/exceptions/base';
import type { User } from '../user/entities/user.entity';
import type { IWorkflowRepository, WorkflowStore } from './interfaces/workflow.repository.interface';
import { id } from './workflow.helpers';
export class WorkflowContextService {
    constructor(private readonly repository: IWorkflowRepository) { }
    async audit(store: WorkflowStore, actor: User | null, event: string, entityType: string, entityId: string, safeDetails: Record<string, unknown> = {}) {
        await store.save('auditLog', {
            id: id(), actorType: actor ? 'USER' : 'SERVICE', actorId: actor?.id ?? null, event, entityType, entityId, safeDetails
        });
    }
    async batch(batchId: string, store: WorkflowStore = this.repository, lock = false) {
        const batch = await store.get('batch', batchId, lock);
        if (!batch)
            throw new NotFoundException('Batch not found');
        return batch;
    }
    async job(jobId: string, store: WorkflowStore = this.repository, lock = false) {
        const existing = await store.get('job', jobId);
        if (!existing)
            throw new NotFoundException('Job not found');
        await this.batch(existing.batchId, store, lock);
        return lock ? (await store.get('job', jobId, true))! : existing;
    }
}
