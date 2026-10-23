import { OAuth2Client } from "google-auth-library"
import { UnauthorizedException } from "../../../core/exceptions/base"
import { config } from "../../../config/config"
import type { GoogleCodeVerifier } from "../interfaces/google-code-verifier.interface"

export class GoogleAuthAdapter implements GoogleCodeVerifier {
    private getOauth2Client() {
        const oAuth2Client = new OAuth2Client(
            config.google.clientId,
            config.google.clientSecret,
            "postmessage"
        )
        return oAuth2Client
    }

    async verify(code: string): Promise<{ email: string }> {
        try {
            const client = this.getOauth2Client()
            const result = await client.getToken(code)
            if (!result.tokens.id_token) {
                throw new Error("Missing ID token")
            }
            const ticket = await client.verifyIdToken({
                idToken: result.tokens.id_token,
                audience: config.google.clientId
            })
            const payload = ticket.getPayload()
            if (!payload?.email || payload.email_verified !== true) {
                throw new Error("Unverified email")
            }
            return { email: payload.email }
        } catch {
            throw new UnauthorizedException("Invalid Google credentials")
        }
    }
}
