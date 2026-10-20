import {
    Entity,
    Index,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm"
import { User } from "../../user/entities/user.entity"

@Entity("password_reset_tokens")
export class PasswordResetToken {
    @PrimaryGeneratedColumn()
    id!: number

    @Index("IX_password_reset_user")
    @Column({ name: "user_id" })
    userId!: number

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User

    @Column()
    email!: string

    @Column({ name: "token_hash", length: 64, unique: true })
    tokenHash!: string

    @Column({ name: "expires_at", type: "datetime" })
    expiresAt!: Date

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date
}
