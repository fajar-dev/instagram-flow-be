import type { Context, Next } from "hono"
import { authService } from "../../modules/auth/auth.module"
import { UnauthorizedException } from "../exceptions/base"

export const authMiddleware = async (c: Context, next: Next) => {
    const match = c.req.header("Authorization")?.match(/^Bearer (\S+)$/i)
    if (!match) throw new UnauthorizedException("Missing or invalid authorization header")
    c.set("user", await authService.authenticateAccessToken(match[1]))
    await next()
}
