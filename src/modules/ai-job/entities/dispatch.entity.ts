import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("job_dispatches")
export class Dispatch {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string;
    @Column({ type: "varchar", name: "job_id", length: 36 })
    jobId!: string;
    @Column({ type: "varchar", name: "event_id", length: 36 })
    eventId!: string;
    @Column({ type: "varchar", name: "status", length: 40 })
    status!: string;
    @Column({ type: "int", name: "attempt_no" })
    attemptNo!: number;
    @Column({ type: "datetime", name: "next_retry_at", precision: 6 })
    nextRetryAt!: Date;
    @Column({ type: "datetime", name: "locked_until", precision: 6, nullable: true })
    lockedUntil!: Date | null;
    @Column({ type: "int", name: "last_response_code", nullable: true })
    lastResponseCode!: number | null;
    @Column({ type: "datetime", name: "sent_at", precision: 6, nullable: true })
    sentAt!: Date | null;
    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date;
    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date;
}
