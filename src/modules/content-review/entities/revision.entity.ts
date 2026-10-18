import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("draft_revisions")
export class Revision {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string;
    @Column({ type: "varchar", name: "draft_id", length: 36 })
    draftId!: string;
    @Column({ type: "int", name: "revision_no" })
    revisionNo!: number;
    @Column({ type: "varchar", name: "primary_asset_id", length: 36 })
    primaryAssetId!: string;
    @Column({ type: "varchar", name: "title", length: 300 })
    title!: string;
    @Column({ type: "text", name: "caption" })
    caption!: string;
    @Column({ type: "json", name: "hashtags" })
    hashtags!: string[];
    @Column({ type: "varchar", name: "location", length: 200 })
    location!: string;
    @Column({ type: "varchar", name: "activity", length: 200 })
    activity!: string;
    @Column({ type: "varchar", name: "content_hash", length: 64 })
    contentHash!: string;
    @Column({ type: "int", name: "created_by", nullable: true })
    createdBy!: number | null;
    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date;
    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date;
}
