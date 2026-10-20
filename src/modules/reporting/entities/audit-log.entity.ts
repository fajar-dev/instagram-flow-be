import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("audit_logs")
export class AuditLog {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "actor_type", length: 20 })
    actorType!: string

    @Column({ type: "int", name: "actor_id", nullable: true })
    actorId!: number | null

    @Column({ type: "varchar", name: "event", length: 80 })
    event!: string

    @Column({ type: "varchar", name: "entity_type", length: 40 })
    entityType!: string

    @Column({ type: "varchar", name: "entity_id", length: 128 })
    entityId!: string

    @Column({ type: "json", name: "safe_details" })
    safeDetails!: Record<string, unknown>

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
