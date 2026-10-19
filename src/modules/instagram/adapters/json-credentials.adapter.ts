import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { BadRequestException } from '../../../core/exceptions/base'
import type { IInstagramCredentials, InstagramCredentials } from '../interfaces/instagram.interface'

const accountSchema = z.object({
    key: z.string().regex(/^[a-z0-9_-]{1,64}$/), label: z.string().trim().min(1).max(100),
    instagramUserId: z.string().regex(/^\d*$/),
    accessToken: z.string(), enabled: z.boolean(), tokenExpiresAt: z.string().datetime().nullable()
}).refine(a => !a.enabled || Boolean(a.instagramUserId && a.accessToken), 'Enabled account requires credentials')
export const credentialsSchema = z.object({
    graphVersion: z.string().regex(/^v\d+\.0$/),
    app: z.object({ appId: z.string(), appSecret: z.string() }),
    accounts: z.array(accountSchema).max(100)
}).refine(v => new Set(v.accounts.map(a => a.key)).size === v.accounts.length, 'Account keys must be unique')

export class JsonInstagramCredentials implements IInstagramCredentials {
    constructor(private readonly path: string) {}
    async read(): Promise<InstagramCredentials> {
        try {
            const raw = await readFile(this.path, 'utf8')
            if (raw.length > 1024 * 1024) throw new Error('oversized')
            return credentialsSchema.parse(JSON.parse(raw))
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return { graphVersion: 'v24.0', app: { appId: '', appSecret: '' }, accounts: [] }
            }
            throw new BadRequestException('Instagram credential file is invalid')
        }
    }
}
