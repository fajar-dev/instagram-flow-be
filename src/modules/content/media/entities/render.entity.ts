import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("renders")
export class Render {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "ai_result_id", length: 36 })
    aiResultId!: string

    @Column({ type: "varchar", name: "placement", length: 20 })
    placement!: string

    @Column({ type: "varchar", name: "format", length: 10 })
    format!: string

    @Column({ type: "int", name: "width" })
    width!: number

    @Column({ type: "int", name: "height" })
    height!: number

    @Column({ type: "varchar", name: "storage_key", length: 255 })
    storageKey!: string

    @Column({ type: "varchar", name: "asset_id", length: 36 })
    assetId!: string

    @Column({ type: "varchar", name: "render_state", length: 30 })
    renderState!: string

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
