export interface MicrosoftCodeVerifier {
    verify(code: string, codeVerifier: string): Promise<{ email: string }>
}
