import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("reviews")
export class Review {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "draft_id", length: 36 })
    draftId!: string

    @Column({ type: "varchar", name: "revision_id", length: 36 })
    revisionId!: string

    @Column({ type: "int", name: "reviewer_id" })
    reviewerId!: number

    @Column({ type: "varchar", name: "decision", length: 40 })
    decision!: string

    @Column({ type: "text", name: "notes" })
    notes!: string

    @Column({ type: "varchar", name: "content_hash", length: 64 })
    contentHash!: string

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
