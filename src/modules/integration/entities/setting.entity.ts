import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("settings")
export class Setting {
    @PrimaryColumn({ type: "varchar", length: 36 })
    id!: string

    @Column({ type: "varchar", name: "key", length: 100 })
    key!: string

    @Column({ type: "json", name: "non_secret_value" })
    nonSecretValue!: Record<string, unknown>

    @Column({ type: "int", name: "updated_by" })
    updatedBy!: number

    @CreateDateColumn({ name: "created_at", type: "datetime", precision: 6 })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at", type: "datetime", precision: 6 })
    updatedAt!: Date
}
