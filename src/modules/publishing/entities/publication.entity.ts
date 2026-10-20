import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export interface PublicationSnapshot {
    title: string
    caption: string
    hashtags: string[]
    revisionNo: number
    contentHash: string
    source: "photo" | "design"
    placement: "feed" | "story"
    accountLabel: string
    instagramUserId: string
}

export type PublicationStatus =
    | "QUEUED"
    | "SCHEDULED"
    | "PROCESSING"
    | "PUBLISHING"
    | "PUBLISHED"
    | "FAILED"
    | "UNKNOWN"
    | "CANCELLED"

@Entity("publications")
export class Publication {
    @PrimaryColumn({ type: "varchar", length: 36 }) id!: string

    @Column({ name: "batch_id", type: "varchar", length: 36, unique: true }) batchId!: string

    @Column({ name: "draft_id", type: "varchar", length: 36 }) draftId!: string

    @Column({ name: "revision_id", type: "varchar", length: 36 }) revisionId!: string

    @Column({ name: "account_key", type: "varchar", length: 64 }) accountKey!: string

    @Column({ name: "request_key", type: "varchar", length: 128 }) requestKey!: string

    @Column({ name: "request_hash", type: "varchar", length: 64 }) requestHash!: string

    @Column({ type: "json" }) snapshot!: PublicationSnapshot

    @Column({ name: "media_key", type: "varchar", length: 255 }) mediaKey!: string

    @Column({ type: "varchar", length: 20 }) status!: PublicationStatus

    @Column({ name: "scheduled_at", type: "datetime", precision: 6 }) scheduledAt!: Date

    @Column({ name: "next_attempt_at", type: "datetime", precision: 6 }) nextAttemptAt!: Date

    @Column({ name: "locked_until", type: "datetime", precision: 6, nullable: true })
    lockedUntil!: Date | null

    @Column({ name: "lock_token", type: "varchar", length: 36, nullable: true }) lockToken!:
        string | null

    @Column({ name: "container_id", type: "varchar", length: 128, nullable: true }) containerId!:
        string | null

    @Column({ name: "container_created_at", type: "datetime", precision: 6, nullable: true })
    containerCreatedAt!: Date | null

    @Column({ name: "media_id", type: "varchar", length: 128, nullable: true }) mediaId!:
        string | null

    @Column({ type: "varchar", length: 500, nullable: true }) permalink!: string | null

    @Column({ name: "safe_error", type: "varchar", length: 500, nullable: true }) safeError!:
        string | null

    @Column({ name: "attempt_count", type: "int", default: 0 }) attemptCount!: number

    @Column({ name: "published_at", type: "datetime", precision: 6, nullable: true })
    publishedAt!: Date | null

    @Column({ name: "created_by", type: "int" }) createdBy!: number

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 }) createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 }) updatedAt!: Date
}
