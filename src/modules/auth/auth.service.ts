import { User } from "../user/entities/user.entity"
import {
    RegisterValidator,
    LoginValidator,
    ForgotPasswordValidator,
    ResetPasswordValidator,
    RefreshTokenValidator,
    GoogleLoginValidator,
} from "./validators/auth.validator"
import { UnauthorizedException, BadRequestException, NotFoundException } from "../../core/exceptions/base"
import { hashPassword, comparePassword } from "../../core/helpers/hash"
import { verify } from "hono/jwt"
import { config } from "../../config/config"
import crypto from "crypto"
import type { IMailer } from "../../core/interfaces/mailer.interface"
import { UserService } from "../user/user.service"
import { AuthHelper } from "../../core/helpers/auth"
import { minio } from "../../core/helpers/minio"

import { IPasswordResetTokenRepository } from "./interfaces/password-reset-token.repository.interface"
import { renderForgotPasswordEmail } from "../../core/templates/email"

const RESET_TOKEN_TTL_HOURS = 10

export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly passwordResetTokens: IPasswordResetTokenRepository,
        private readonly mailer: IMailer,
    ) { }

    async register(data: RegisterValidator) {
        if (data.email) {
            const existing = await this.userService.getByEmail(data.email)
            if (existing) {
                throw new BadRequestException("Email already in use")
            }
        }

        // Transaction dikelola di repository layer (bukan service)
        return await this.userService.saveInTransaction({
            ...data,
            password: await hashPassword(data.password),
        })
    }

    async googleLogin(data: GoogleLoginValidator) {
        const payload = await AuthHelper.verifyGoogleCode(data.code)
        let user = await this.userService.getByEmailWithPassword(payload.email!)

        if (!user) {
            throw new BadRequestException("User not registered")
        }

        if (!user.isActive) {
            throw new BadRequestException("Account is inactive")
        }

        const { accessToken, refreshToken } = await AuthHelper.generateTokens(user)
        return { user, accessToken, refreshToken }
    }

    async login(data: LoginValidator) {
        const user = await this.userService.getByEmailWithPassword(data.email)
        if (!user) {
            throw new UnauthorizedException("User not registered")
        }

        if (!user.isActive) {
            throw new UnauthorizedException("Account is inactive")
        }

        if (!user.password) {
            throw new UnauthorizedException("Invalid credentials")
        }

        const isValid = await comparePassword(data.password, user.password)
        if (!isValid) {
            throw new UnauthorizedException("Invalid credentials")
        }

        const { accessToken, refreshToken } = await AuthHelper.generateTokens(user)
        return { user, accessToken, refreshToken }
    }

    async authenticateAccessToken(token: string): Promise<User> {
        return this.authenticateToken(token, config.app.jwtSecret, "Invalid or expired token")
    }

    private async authenticateToken(token: string, secret: string, message: string): Promise<User> {
        let userId: number
        try {
            const decoded = await verify(token, secret, "HS256")
            if (typeof decoded.sub !== "number" || !Number.isSafeInteger(decoded.sub) || decoded.sub <= 0) {
                throw new UnauthorizedException(message)
            }
            userId = decoded.sub
        } catch {
            throw new UnauthorizedException(message)
        }

        let user: User
        try {
            user = await this.userService.getByIdWithPassword(userId)
        } catch (error) {
            if (error instanceof NotFoundException) throw new UnauthorizedException(message)
            throw error
        }
        if (!user.isActive) throw new UnauthorizedException("Account is inactive")
        return user
    }

    async refreshToken(data: RefreshTokenValidator) {
        const user = await this.authenticateToken(data.refreshToken, config.app.jwtRefreshSecret, "Invalid or expired refresh token")
        const { accessToken, refreshToken } = await AuthHelper.generateTokens(user)
        return { user, accessToken, refreshToken }
    }

    async forgotPassword(data: ForgotPasswordValidator) {
        const user = await this.userService.getByEmail(data.email)
        if (!user) {
            throw new BadRequestException("Email not found")
        }

        if (!user.isActive) {
            throw new BadRequestException("Account is inactive")
        }

        const resetToken = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000)

        await this.passwordResetTokens.createForUser(
            user.id, user.email, this.hashResetToken(resetToken), expiresAt,
        )

        const resetUrl = new URL("auth/reset-password", `${config.app.frontendUrl.replace(/\/$/, "")}/`)
        resetUrl.search = new URLSearchParams({ email: user.email, token: resetToken }).toString()
        const { html, text } = renderForgotPasswordEmail({
            name: user.name,
            resetLink: resetUrl.toString(),
            expiresInHours: RESET_TOKEN_TTL_HOURS,
        })
        await this.mailer.sendHtml(user.email, "Reset Password", html, text)
    }

    async resetPassword(data: ResetPasswordValidator) {
        const passwordHash = await hashPassword(data.newPassword)
        const consumed = await this.passwordResetTokens.consumeAndResetPassword(this.hashResetToken(data.token), passwordHash)
        if (!consumed) {
            throw new BadRequestException("Invalid or expired reset token")
        }

        return true
    }

    async validateResetToken(email: string, token: string) {
        const resetToken = await this.passwordResetTokens.findValid(this.hashResetToken(token), email)
        if (!resetToken) {
            throw new BadRequestException("Invalid or expired reset token")
        }
        return true
    }

    private hashResetToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex")
    }

    async logout(_user: User) {
        return true
    }

    async updateProfile(userId: number, data: { name: string; email: string; photo?: string | null }) {
        const user = await this.userService.getByIdWithPassword(userId)

        if (data.email && data.email !== user.email) {
            const existing = await this.userService.getByEmail(data.email)
            if (existing) {
                throw new BadRequestException("Email already in use")
            }
        }

        user.name = data.name
        user.email = data.email
        if (data.photo !== undefined) {
            user.photo = minio.sanitizePath(data.photo)
        }

        return await this.userService.save(user)
    }

    async updatePassword(userId: number, data: { oldPassword?: string; newPassword: string }) {
        const user = await this.userService.getByIdWithPassword(userId)

        if (user.password) {
            if (!data.oldPassword) {
                throw new BadRequestException("Old password is required")
            }
            const isValid = await comparePassword(data.oldPassword, user.password)
            if (!isValid) {
                throw new BadRequestException("Invalid old password")
            }
        }

        user.password = await hashPassword(data.newPassword)
        await this.userService.save(user)
        return true
    }
}
