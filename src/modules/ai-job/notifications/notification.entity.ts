import type { NotificationPart } from "./notification-content"
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("job_notifications")
export class JobNotification {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ name: "job_id", type: "varchar", length: 36, unique: true })
    jobId!: string

    @Column({ name: "project_name", type: "varchar", length: 150 })
    projectName!: string

    @Column({ type: "varchar", length: 10 })
    output!: "feed" | "story"

    @Column({ name: "chat_id", type: "varchar", length: 128 })
    chatId!: string

    @Column({ name: "detail_url", type: "varchar", length: 2048 })
    detailUrl!: string

    @Column({ type: "varchar", length: 20 })
    status!: "PENDING" | "SENDING" | "SENT" | "FAILED" | "UNKNOWN"

    @Column({ type: "json" })
    parts!: NotificationPart[]

    @Column({ name: "next_part", type: "int", default: 0 })
    nextPart!: number

    @Column({ name: "attempt_no", type: "int" })
    attemptNo!: number

    @Column({ name: "next_retry_at", type: "datetime", precision: 6 })
    nextRetryAt!: Date

    @Column({ name: "locked_until", type: "datetime", precision: 6, nullable: true })
    lockedUntil!: Date | null

    @Column({ name: "message_id", type: "varchar", length: 32, nullable: true })
    messageId!: string | null

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
