import type { Context, Next } from "hono"
import { authService } from "../../modules/auth/auth.module"
import { UnauthorizedException } from "../exceptions/base"

export const tokenAuthMiddleware = async (c: Context, next: Next) => {
    const token =
        c.req.query("token") || c.req.header("Authorization")?.match(/^Bearer (\S+)$/i)?.[1]
    if (!token) {
        throw new UnauthorizedException("Authentication token is required")
    }
    c.set("user", await authService.authenticateAccessToken(token))
    await next()
}
