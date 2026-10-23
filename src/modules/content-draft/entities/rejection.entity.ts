import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("rejections")
export class Rejection {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "draft_id", length: 36 })
    draftId!: string

    @Column({ type: "int", name: "rejected_by" })
    rejectedBy!: number

    @Column({ type: "text", name: "notes" })
    notes!: string

    @Column({ type: "varchar", name: "content_hash", length: 64 })
    contentHash!: string

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
