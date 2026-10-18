import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity("batches")
export class Batch {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string;
    @Column({ type: "int", name: "uploader_id" })
    uploaderId!: number;
    @Column({ type: "varchar", name: "project_name", length: 150 })
    projectName!: string;
    @Column({ type: "varchar", name: "activity", length: 200 })
    activity!: string;
    @Column({ type: "varchar", name: "location", length: 200 })
    location!: string;
    @Column({ type: "date", name: "documentation_date" })
    documentationDate!: string;
    @Column({ type: "text", name: "description" })
    description!: string;
    @Column({ type: "varchar", name: "client_name", length: 200 })
    clientName!: string;
    @Column({ type: "boolean", name: "publication_permission" })
    publicationPermission!: boolean;
    @Column({ type: "int", name: "consent_by" })
    consentBy!: number;
    @Column({ type: "datetime", name: "consent_at", precision: 6 })
    consentAt!: Date;
    @Column({ type: "varchar", name: "status", length: 40 })
    status!: string;
    @Column({ type: "varchar", name: "idempotency_key", length: 128 })
    idempotencyKey!: string;
    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date;
    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date;
}
