/** Integration endpoints require absolute HTTPS URLs without embedded credentials. */
export function isHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
    } catch {
        return false
    }
}
