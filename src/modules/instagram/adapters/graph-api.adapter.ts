import { GraphInstagramClient, InstagramApiError } from "./graph-client"
import {
    graphProfile,
    graphIdentity,
    graphQuota,
    graphStatus,
    graphPermalink,
    instagramPermalink
} from "./graph-response"
import type { IInstagramApi } from "../interfaces/instagram.interface"

export { InstagramApiError } from "./graph-client"

export class GraphInstagramApi extends GraphInstagramClient implements IInstagramApi {
    async profile(key: string) {
        const data = await this.request(key, null, "GET", { fields: "id,username" }, graphProfile)
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
            { fields: "quota_usage,config" },
            graphQuota
        )
        const limit = quota.data?.[0]
        if (
            typeof limit?.quota_usage === "number" &&
            typeof limit?.config?.quota_total === "number" &&
            limit.quota_usage >= limit.config.quota_total
        ) {
            throw new InstagramApiError(4, true)
        }
        const data = await this.request(
            key,
            `${account.instagramUserId}/media`,
            "POST",
            {
                image_url: imageUrl,
                ...(placement === "story" ? { media_type: "STORIES" } : { caption })
            },
            graphIdentity
        )
        if (!/^\d+$/.test(String(data.id))) {
            throw new InstagramApiError(0, true)
        }
        return String(data.id)
    }

    async status(key: string, containerId: string) {
        return String(
            (await this.request(key, containerId, "GET", { fields: "status_code" }, graphStatus))
                .status_code
        )
    }

    async publish(key: string, containerId: string) {
        const { account } = await this.accounts.requireAccount(key)
        const data = await this.request(
            key,
            `${account.instagramUserId}/media_publish`,
            "POST",
            {
                creation_id: containerId
            },
            graphIdentity
        )
        if (!/^\d+$/.test(String(data.id))) {
            throw new InstagramApiError(0, true)
        }
        return String(data.id)
    }

    async permalink(key: string, mediaId: string) {
        const data = await this.request(
            key,
            mediaId,
            "GET",
            { fields: "permalink" },
            graphPermalink
        )
        return instagramPermalink(data.permalink)
    }
}
