import type { AuditLog } from "../entities/audit-log.entity"

type PublicFields = Pick<
    AuditLog,
    | "id"
    | "actorType"
    | "actorId"
    | "event"
    | "entityType"
    | "entityId"
    | "safeDetails"
    | "createdAt"
    | "updatedAt"
>

export class AuditLogSerializer {
    static single(value: PublicFields) {
        return {
            id: value.id,
            actorType: value.actorType,
            actorId: value.actorId,
            event: value.event,
            entityType: value.entityType,
            entityId: value.entityId,
            safeDetails: value.safeDetails,
            createdAt: value.createdAt,
            updatedAt: value.updatedAt
        }
    }

    static collection(values: PublicFields[]) {
        return values.map((value) => this.single(value))
    }
}
