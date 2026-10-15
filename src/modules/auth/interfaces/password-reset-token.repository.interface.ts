import { PasswordResetToken } from "../entities/password-reset-token.entity"

export interface IPasswordResetTokenRepository {
    createForUser(userId: number, email: string, tokenHash: string, expiresAt: Date): Promise<void>
    findValid(tokenHash: string, email: string): Promise<PasswordResetToken | null>
    consumeAndResetPassword(tokenHash: string, passwordHash: string): Promise<boolean>
}
