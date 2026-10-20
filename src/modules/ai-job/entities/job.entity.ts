import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("jobs")
export class Job {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "batch_id", length: 36 })
    batchId!: string

    @Column({ type: "json", name: "requested_outputs" })
    requestedOutputs!: string[]

    @Column({ type: "varchar", name: "status", length: 40 })
    status!: string

    @Column({ type: "int", name: "attempt_no" })
    attemptNo!: number

    @Column({ type: "varchar", name: "last_execution_id", length: 128, nullable: true })
    lastExecutionId!: string | null

    @Column({ type: "datetime", name: "started_at", precision: 6, nullable: true })
    startedAt!: Date | null

    @Column({ type: "datetime", name: "completed_at", precision: 6, nullable: true })
    completedAt!: Date | null

    @Column({ type: "varchar", name: "error_code", length: 80, nullable: true })
    errorCode!: string | null

    @Column({ type: "varchar", name: "safe_error", length: 500, nullable: true })
    safeError!: string | null

    @Column({ type: "boolean", name: "retryable" })
    retryable!: boolean

    @Column({ type: "varchar", name: "retry_of_job_id", length: 36, nullable: true })
    retryOfJobId!: string | null

    @Column({ type: "int", name: "created_by" })
    createdBy!: number

    @Column({ type: "varchar", name: "idempotency_key", length: 128 })
    idempotencyKey!: string

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
