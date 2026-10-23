export interface GoogleCodeVerifier {
    verify(code: string): Promise<{ email: string }>
}
