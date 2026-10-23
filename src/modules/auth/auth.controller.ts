import { Context } from "hono"
import { AuthService } from "./auth.service"
import { ApiResponse } from "../../core/helpers/response"
import { AuthSerializer } from "./serializers/auth.serialize"
import { BadRequestException } from "../../core/exceptions/base"

export class AuthController {
    constructor(private readonly service: AuthService) {}

    async register(c: Context) {
        const body = c.req.valid("json" as never)
        const user = await this.service.register(body)
        const serialized = await AuthSerializer.single(user)
        return ApiResponse.success(c, serialized, "User registered successfully", 201)
    }

    private async sessionResponse(
        c: Context,
        data: Awaited<ReturnType<AuthService["login"]>>,
        message = "Logged in successfully"
    ) {
        return ApiResponse.success(
            c,
            {
                user: await AuthSerializer.single(data.user),
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
            },
            message
        )
    }

    async login(c: Context) {
        return this.sessionResponse(c, await this.service.login(c.req.valid("json" as never)))
    }

    async google(c: Context) {
        return this.sessionResponse(c, await this.service.googleLogin(c.req.valid("json" as never)))
    }

    async microsoft(c: Context) {
        return this.sessionResponse(
            c,
            await this.service.microsoftLogin(c.req.valid("json" as never))
        )
    }

    async refreshToken(c: Context) {
        return this.sessionResponse(
            c,
            await this.service.refreshToken(c.req.valid("json" as never)),
            "Token refreshed successfully"
        )
    }

    async me(c: Context) {
        const user = c.get("user")
        const serialized = await AuthSerializer.single(user)
        return ApiResponse.success(c, serialized, "User profile retrieved successfully")
    }

    async logout(c: Context) {
        const user = c.get("user")
        await this.service.logout(user)
        return ApiResponse.success(c, null, "Logged out successfully")
    }

    async forgotPassword(c: Context) {
        const body = c.req.valid("json" as never)
        await this.service.forgotPassword(body)
        return ApiResponse.success(
            c,
            null,
            "Password reset instructions have been sent to your email"
        )
    }

    async validateResetToken(c: Context) {
        const email = c.req.query("email")
        const token = c.req.query("token")
        if (!token) {
            throw new BadRequestException("Reset token is required")
        }
        if (!email) {
            throw new BadRequestException("Email is required")
        }
        await this.service.validateResetToken(email, token)
        return ApiResponse.success(c, null, "Token is valid")
    }

    async resetPassword(c: Context) {
        const body = c.req.valid("json" as never)
        await this.service.resetPassword(body)
        return ApiResponse.success(c, null, "Password has been successfully reset")
    }

    async updateProfile(c: Context) {
        const user = c.get("user")
        const body = c.req.valid("json" as never)
        const updatedUser = await this.service.updateProfile(user.id, body)
        const serialized = await AuthSerializer.single(updatedUser)
        return ApiResponse.success(c, serialized, "Profile updated successfully")
    }

    async updatePassword(c: Context) {
        const user = c.get("user")
        const body = c.req.valid("json" as never)
        await this.service.updatePassword(user.id, body)
        return ApiResponse.success(c, null, "Password updated successfully")
    }
}
