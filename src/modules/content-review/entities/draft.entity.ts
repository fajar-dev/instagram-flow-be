import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
export type DraftStatus = 'READY_FOR_REVIEW' | 'PUBLISH' | 'REJECTED';
@Entity("drafts")
export class Draft {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string;
    @Column({ type: "varchar", name: "job_id", length: 36 })
    jobId!: string;
    @Column({ type: "varchar", name: "current_revision_id", length: 36, nullable: true })
    currentRevisionId!: string | null;
    @Column({ type: "varchar", name: "review_status", length: 40 })
    reviewStatus!: DraftStatus;
    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date;
    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date;
}
