import { ConfidentialClientApplication } from "@azure/msal-node"
import { z } from "zod"
import { config } from "../../../config/config"
import { UnauthorizedException } from "../../../core/exceptions/base"
import type { MicrosoftCodeVerifier } from "../interfaces/microsoft-code-verifier.interface"

export class MicrosoftAuthAdapter implements MicrosoftCodeVerifier {
    private client?: ConfidentialClientApplication

    async verify(code: string, codeVerifier: string): Promise<{ email: string }> {
        try {
            const { clientId, clientSecret, tenantId, redirectUri } = config.microsoft
            if (!clientId || !clientSecret) {
                throw new Error("Microsoft login is not configured")
            }
            this.client ??= new ConfidentialClientApplication({
                auth: {
                    clientId,
                    clientSecret,
                    authority: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}`
                }
            })
            const result = await this.client.acquireTokenByCode({
                code,
                codeVerifier,
                redirectUri:
                    redirectUri || new URL("/auth/microsoft/callback", config.app.frontendUrl).href,
                scopes: ["openid", "profile", "email"]
            })
            const claims = result?.idTokenClaims as
                { email?: string; preferred_username?: string } | undefined
            const email = z
                .email()
                .parse(claims?.email || claims?.preferred_username || result?.account?.username)
            return { email: email.toLowerCase() }
        } catch {
            // Provider responses can contain credentials and personal data; keep them private.
            throw new UnauthorizedException("Invalid Microsoft credentials")
        }
    }
}
