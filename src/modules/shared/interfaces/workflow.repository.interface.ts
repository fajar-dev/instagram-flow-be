import type { WorkflowRecords } from "../entities"

export type WorkflowKind = keyof WorkflowRecords

export type Criteria<K extends WorkflowKind> = Partial<WorkflowRecords[K]>

export interface WorkflowStore {
    get<K extends WorkflowKind>(
        kind: K,
        id: string,
        lock?: boolean
    ): Promise<WorkflowRecords[K] | null>
    find<K extends WorkflowKind>(kind: K, where: Criteria<K>): Promise<WorkflowRecords[K][]>
    save<K extends WorkflowKind>(
        kind: K,
        value: Partial<WorkflowRecords[K]>
    ): Promise<WorkflowRecords[K]>
}

export interface IWorkflowRepository extends WorkflowStore {
    transaction<T>(work: (store: WorkflowStore) => Promise<T>): Promise<T>
    dueDispatchIds(): Promise<string[]>
    expiredJobIds(timeoutSeconds: number): Promise<string[]>
}
