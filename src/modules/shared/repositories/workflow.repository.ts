import { EntityManager, type DeepPartial } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { workflowEntityMap, type WorkflowRecords } from '../entities';
import type { Criteria, IWorkflowRepository, WorkflowKind, WorkflowStore } from '../interfaces/workflow.repository.interface';
class TransactionStore implements WorkflowStore {
    constructor(private readonly manager: EntityManager) { }
    private repo<K extends WorkflowKind>(kind: K) {
        return this.manager.getRepository<WorkflowRecords[K]>(workflowEntityMap[kind] as never);
    }
    get<K extends WorkflowKind>(kind: K, id: string, lock = false): Promise<WorkflowRecords[K] | null> {
        return this.repo(kind).findOne({ where: { id } as never, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) });
    }
    find<K extends WorkflowKind>(kind: K, where: Criteria<K>): Promise<WorkflowRecords[K][]> {
        return this.repo(kind).find({ where: where as never, order: { createdAt: 'ASC' } as never });
    }
    async save<K extends WorkflowKind>(kind: K, value: Partial<WorkflowRecords[K]>): Promise<WorkflowRecords[K]> {
        return this.repo(kind).save(value as DeepPartial<WorkflowRecords[K]>);
    }
}
export class TypeOrmWorkflowRepository implements IWorkflowRepository {
    private store() { return new TransactionStore(AppDataSource.manager); }
    get<K extends WorkflowKind>(kind: K, id: string) { return this.store().get(kind, id); }
    find<K extends WorkflowKind>(kind: K, where: Criteria<K>) { return this.store().find(kind, where); }
    save<K extends WorkflowKind>(kind: K, value: Partial<WorkflowRecords[K]>) { return this.store().save(kind, value); }
    transaction<T>(work: (store: WorkflowStore) => Promise<T>): Promise<T> {
        return AppDataSource.transaction(manager => work(new TransactionStore(manager)));
    }
    async dueDispatchIds() {
        const rows = await AppDataSource.getRepository(workflowEntityMap.dispatch).createQueryBuilder('d')
            .where("d.status IN ('PENDING', 'SENDING') AND d.next_retry_at <= :now AND (d.locked_until IS NULL OR d.locked_until < :now)", { now: new Date() })
            .orderBy('d.created_at', 'ASC').take(20).getMany();
        return rows.map(row => row.id);
    }
    async expiredJobIds(timeoutSeconds: number) {
        const rows = await AppDataSource.getRepository(workflowEntityMap.job).createQueryBuilder('j')
            .where("j.status IN ('PROCESSING','DISPATCHED') AND COALESCE(j.started_at, j.updated_at) < :before", { before: new Date(Date.now() - timeoutSeconds * 1000) }).take(100).getMany();
        return rows.map(row => row.id);
    }
}
