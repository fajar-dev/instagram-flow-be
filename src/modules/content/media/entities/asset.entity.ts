import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("assets")
export class Asset {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string;
    @Column({ type: "varchar", name: "batch_id", length: 36 })
    batchId!: string;
    @Column({ type: "varchar", name: "original_storage_key", length: 255 })
    originalStorageKey!: string;
    @Column({ type: "varchar", name: "safe_preview_storage_key", length: 255 })
    safePreviewStorageKey!: string;
    @Column({ type: "varchar", name: "mime", length: 50 })
    mime!: string;
    @Column({ type: "int", name: "byte_size" })
    byteSize!: number;
    @Column({ type: "int", name: "width" })
    width!: number;
    @Column({ type: "int", name: "height" })
    height!: number;
    @Column({ type: "varchar", name: "sha256", length: 64 })
    sha256!: string;
    @Column({ type: "datetime", name: "deleted_at", precision: 6, nullable: true })
    deletedAt!: Date | null;
    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date;
    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date;
}
