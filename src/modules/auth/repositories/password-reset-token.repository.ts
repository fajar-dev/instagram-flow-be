import { MoreThan } from "typeorm"
import { AppDataSource } from "../../../config/database"
import { User } from "../../user/entities/user.entity"
import { PasswordResetToken } from "../entities/password-reset-token.entity"
import { IPasswordResetTokenRepository } from "../interfaces/password-reset-token.repository.interface"

export class TypeOrmPasswordResetTokenRepository implements IPasswordResetTokenRepository {
    private readonly repository = AppDataSource.getRepository(PasswordResetToken)

    async createForUser(userId: number, email: string, tokenHash: string, expiresAt: Date) {
        await AppDataSource.transaction(async (manager) => {
            // Serialize issuance and consumption for the same account.
            await manager.findOneOrFail(User, { where: { id: userId }, lock: { mode: "pessimistic_write" } })
            await manager.save(PasswordResetToken, { userId, email, tokenHash, expiresAt })
        })
    }

    findValid(tokenHash: string, email: string) {
        return this.repository.findOne({
            where: { tokenHash, email, expiresAt: MoreThan(new Date()), user: { email, isActive: true } },
        })
    }

    async consumeAndResetPassword(tokenHash: string, passwordHash: string): Promise<boolean> {
        return AppDataSource.transaction(async (manager) => {
            const candidate = await manager.findOneBy(PasswordResetToken, { tokenHash })
            if (!candidate) return false

            const user = await manager.findOne(User, {
                where: { id: candidate.userId },
                lock: { mode: "pessimistic_write" },
            })
            if (!user || !user.isActive || user.email !== candidate.email) return false

            const token = await manager.findOne(PasswordResetToken, {
                where: { id: candidate.id, tokenHash, expiresAt: MoreThan(new Date()) },
                lock: { mode: "pessimistic_write" },
            })
            if (!token) return false

            await manager.update(User, user.id, { password: passwordHash })
            await manager.delete(PasswordResetToken, { userId: user.id })
            return true
        })
    }
}
