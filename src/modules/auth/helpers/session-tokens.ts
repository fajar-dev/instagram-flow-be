import { sign } from "hono/jwt"
import { config } from "../../../config/config"

export async function generateSessionTokens(user: { id: number; email: string }) {
    const accessToken = await sign(
        {
            sub: user.id,
            email: user.email,
            exp: Math.floor(Date.now() / 1000) + 60 * 15 // 15 mins
        },
        config.app.jwtSecret,
        "HS256"
    )

    const refreshToken = await sign(
        {
            sub: user.id,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
        },
        config.app.jwtRefreshSecret,
        "HS256"
    )

    return { accessToken, refreshToken }
}
