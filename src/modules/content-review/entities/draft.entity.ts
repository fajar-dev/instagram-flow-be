import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

export type DraftStatus = "READY_FOR_REVIEW" | "PUBLISH" | "REJECTED"

@Entity("drafts")
export class Draft {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "job_id", length: 36 })
    jobId!: string

    @Column({ type: "varchar", name: "title", length: 300 })
    title!: string

    @Column({ type: "text", name: "caption" })
    caption!: string

    @Column({ type: "json", name: "hashtags" })
    hashtags!: string[]

    @Column({ type: "varchar", name: "location", length: 200 })
    location!: string

    @Column({ type: "varchar", name: "activity", length: 200 })
    activity!: string

    @Column({ type: "varchar", name: "content_hash", length: 64 })
    contentHash!: string

    @Column({ type: "varchar", name: "review_status", length: 40 })
    reviewStatus!: DraftStatus

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
