import { expect, test, spyOn } from "bun:test"
import { OAuth2Client, LoginTicket, type TokenPayload } from "google-auth-library"
import { GoogleAuthAdapter } from "../src/modules/auth/adapters/google-auth.adapter"

test("Google code exchange requires a verified email and never exposes provider errors", async () => {
    const token = spyOn(OAuth2Client.prototype, "getToken").mockImplementation(async () => ({
        tokens: { id_token: "private-id-token" },
        res: null
    }))
    let payload = { email: "user@example.com", email_verified: true } as TokenPayload
    const verify = spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(
        async () => new LoginTicket("", payload)
    )
    try {
        expect(await new GoogleAuthAdapter().verify("code")).toEqual({ email: "user@example.com" })
        payload = { ...payload, email_verified: false }
        await expect(new GoogleAuthAdapter().verify("code")).rejects.toThrow(
            "Invalid Google credentials"
        )
        verify.mockImplementationOnce(async () => {
            throw new Error("private upstream payload")
        })
        await expect(new GoogleAuthAdapter().verify("code")).rejects.toThrow(
            "Invalid Google credentials"
        )
    } finally {
        token.mockRestore()
        verify.mockRestore()
    }
})
