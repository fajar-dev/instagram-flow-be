import { BadRequestException } from '../../core/exceptions/base'
import type { IInstagramCredentials } from './interfaces/instagram.interface'

export class InstagramService {
    constructor(private readonly credentials: IInstagramCredentials) {}
    async accounts() {
        const data = await this.credentials.read()
        return data.accounts.map(({ key, label, instagramUserId, enabled, tokenExpiresAt, accessToken }) => ({
            key, label, instagramUserId, enabled, tokenExpiresAt,
            configured: Boolean(instagramUserId && accessToken),
            expired: Boolean(tokenExpiresAt && Date.parse(tokenExpiresAt) <= Date.now())
        }))
    }
    async requireAccount(key: string) {
        const data = await this.credentials.read()
        const account = data.accounts.find(a => a.key === key)
        if (!account || !account.enabled || !account.accessToken ||
            (account.tokenExpiresAt && Date.parse(account.tokenExpiresAt) <= Date.now())) {
            throw new BadRequestException('Instagram account is unavailable or token expired')
        }
        return { account, graphVersion: data.graphVersion }
    }
}
