import { expect, test, spyOn } from "bun:test"
import { ConfidentialClientApplication, type AuthenticationResult } from "@azure/msal-node"
import { MicrosoftAuthAdapter } from "../src/modules/auth/adapters/microsoft-auth.adapter"
import { MicrosoftLoginValidator } from "../src/modules/auth/validators/auth.validator"
import { config } from "../src/config/config"

const verifier = "a".repeat(43)

test("Microsoft exchange uses server redirect and PKCE, normalizes identity and hides provider errors", async () => {
    const original = { ...config.microsoft }
    Object.assign(config.microsoft, {
        clientId: "test-client",
        clientSecret: "test-secret",
        tenantId: "common",
        redirectUri: "http://localhost:3000/auth/microsoft/callback"
    })
    const acquire = spyOn(ConfidentialClientApplication.prototype, "acquireTokenByCode")
    const adapter = new MicrosoftAuthAdapter()
    try {
        acquire.mockResolvedValue({
            idTokenClaims: { email: "USER@EXAMPLE.COM" }
        } as AuthenticationResult)
        expect(await adapter.verify("code", verifier)).toEqual({ email: "user@example.com" })
        expect(acquire).toHaveBeenCalledWith({
            code: "code",
            codeVerifier: verifier,
            redirectUri: config.microsoft.redirectUri,
            scopes: ["openid", "profile", "email"]
        })
        acquire.mockResolvedValue({
            idTokenClaims: { preferred_username: "other@example.com" }
        } as AuthenticationResult)
        expect(await adapter.verify("code", verifier)).toEqual({ email: "other@example.com" })
        acquire.mockResolvedValue({ idTokenClaims: { email: "invalid" } } as AuthenticationResult)
        await expect(adapter.verify("code", verifier)).rejects.toThrow(
            "Invalid Microsoft credentials"
        )
        acquire.mockRejectedValue(new Error("PRIVATE provider response"))
        await expect(adapter.verify("code", verifier)).rejects.toThrow(
            "Invalid Microsoft credentials"
        )
        config.microsoft.clientSecret = ""
        acquire.mockClear()
        await expect(adapter.verify("code", verifier)).rejects.toThrow(
            "Invalid Microsoft credentials"
        )
        expect(acquire).not.toHaveBeenCalled()
    } finally {
        Object.assign(config.microsoft, original)
        acquire.mockRestore()
    }
})

test("Microsoft input requires a PKCE verifier and ignores caller supplied redirect", () => {
    expect(MicrosoftLoginValidator.safeParse({ code: "code" }).success).toBe(false)
    expect(MicrosoftLoginValidator.safeParse({ code: "code", codeVerifier: "short" }).success).toBe(
        false
    )
    expect(
        MicrosoftLoginValidator.parse({
            code: "code",
            codeVerifier: verifier,
            redirectUri: "https://untrusted.test"
        })
    ).toEqual({ code: "code", codeVerifier: verifier })
})
