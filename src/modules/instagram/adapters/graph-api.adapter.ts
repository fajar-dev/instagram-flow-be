import { InstagramService } from "../instagram.service"
import type { IInstagramApi } from "../interfaces/instagram.interface"

export class InstagramApiError extends Error {
    constructor(
        public readonly code: number,
        public readonly retryable: boolean
    ) {
        super(`Instagram API request failed (${code})`)
    }
}

/** Fixed Graph host, bounded requests, no provider payload/token in errors or logs. */
export class GraphInstagramApi implements IInstagramApi {
    constructor(
        private readonly accounts: InstagramService,
        private readonly transport: typeof fetch = fetch
    ) {}

    private async request(
        key: string,
        path: string | null,
        method: "GET" | "POST",
        fields: Record<string, string>
    ) {
        const { account, graphVersion } = await this.accounts.requireAccount(key)
        const url = new URL(
            `https://graph.instagram.com/${graphVersion}/${path ?? account.instagramUserId}`
        )
        const params = new URLSearchParams(fields)
        if (method === "GET") {
            url.search = params.toString()
        }
        let response: Response
        try {
            response = await this.transport(url, {
                method,
                headers: {
                    Authorization: `Bearer ${account.accessToken}`,
                    ...(method === "POST"
                        ? { "Content-Type": "application/x-www-form-urlencoded" }
                        : {})
                },
                body: method === "POST" ? params.toString() : undefined,
                signal: AbortSignal.timeout(20000),
                redirect: "error"
            })
        } catch {
            throw new InstagramApiError(0, true)
        }
        let data: any
        try {
            data = await response.json()
        } catch {
            throw new InstagramApiError(response.status, true)
        }
        if (!response.ok || data.error) {
            throw new InstagramApiError(
                Number(data.error?.code || response.status),
                response.status >= 500 ||
                    response.status === 429 ||
                    [1, 2, 4, 17, 32, 613].includes(Number(data.error?.code)) ||
                    data.error?.is_transient === true
            )
        }
        return data
    }

    async profile(key: string) {
        const data = await this.request(key, null, "GET", { fields: "id,username" })
        if (!/^\d+$/.test(String(data.id)) || typeof data.username !== "string") {
            throw new InstagramApiError(100, false)
        }
        return { id: String(data.id), username: data.username }
    }

    async create(key: string, imageUrl: string, caption: string, placement: "feed" | "story") {
        const { account } = await this.accounts.requireAccount(key)
        const quota = await this.request(
            key,
            `${account.instagramUserId}/content_publishing_limit`,
            "GET",
            { fields: "quota_usage,config" }
        )
        const limit = quota.data?.[0]
        if (
            typeof limit?.quota_usage === "number" &&
            typeof limit?.config?.quota_total === "number" &&
            limit.quota_usage >= limit.config.quota_total
        ) {
            throw new InstagramApiError(4, true)
        }
        const data = await this.request(key, `${account.instagramUserId}/media`, "POST", {
            image_url: imageUrl,
            ...(placement === "story" ? { media_type: "STORIES" } : { caption })
        })
        if (!/^\d+$/.test(String(data.id))) {
            throw new InstagramApiError(0, true)
        }
        return String(data.id)
    }

    async status(key: string, containerId: string) {
        return String(
            (await this.request(key, containerId, "GET", { fields: "status_code" })).status_code
        )
    }

    async publish(key: string, containerId: string) {
        const { account } = await this.accounts.requireAccount(key)
        const data = await this.request(key, `${account.instagramUserId}/media_publish`, "POST", {
            creation_id: containerId
        })
        if (!/^\d+$/.test(String(data.id))) {
            throw new InstagramApiError(0, true)
        }
        return String(data.id)
    }

    async permalink(key: string, mediaId: string) {
        const value = (await this.request(key, mediaId, "GET", { fields: "permalink" })).permalink
        if (typeof value !== "string") {
            return null
        }
        try {
            const url = new URL(value)
            return url.protocol === "https:" &&
                (url.hostname === "www.instagram.com" || url.hostname === "instagram.com")
                ? value
                : null
        } catch {
            return null
        }
    }
}
