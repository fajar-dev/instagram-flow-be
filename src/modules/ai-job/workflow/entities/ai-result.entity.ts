import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("ai_results")
export class AiResult {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "job_id", length: 36 })
    jobId!: string

    @Column({ type: "varchar", name: "execution_id", length: 128 })
    executionId!: string

    @Column({ type: "int", name: "result_version" })
    resultVersion!: number

    @Column({ type: "json", name: "rankings" })
    rankings!: Array<{
        assetId: string
        score: number
        reason: string
    }>

    @Column({ type: "json", name: "selected_asset_ids" })
    selectedAssetIds!: string[]

    @Column({ type: "text", name: "raw_caption" })
    rawCaption!: string

    @Column({ type: "varchar", name: "raw_title", length: 300 })
    rawTitle!: string

    @Column({ type: "json", name: "raw_hashtags" })
    rawHashtags!: string[]

    @Column({ type: "varchar", name: "raw_payload_hash", length: 64 })
    rawPayloadHash!: string

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
