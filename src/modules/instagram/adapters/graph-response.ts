import { z } from "zod"

export const graphId = z.string().regex(/^\d+$/)

export const graphIdentity = z.object({ id: graphId })

export const graphProfile = graphIdentity.extend({ username: z.string() })

export const graphOwner = graphIdentity.extend({ user_id: graphId.optional() })

export const graphStatus = z.object({ status_code: z.string() })

export const graphPermalink = z.object({ permalink: z.string().optional() })

export const graphQuota = z.object({
    data: z
        .array(
            z.object({
                quota_usage: z.number(),
                config: z.object({ quota_total: z.number() }).optional()
            })
        )
        .optional()
})

export const graphMedia = graphIdentity.extend({
    caption: z.string().optional(),
    media_type: z.string().optional(),
    media_product_type: z.string().optional(),
    timestamp: z.string().optional(),
    permalink: z.string().optional(),
    owner: graphIdentity.optional()
})

export const graphMediaPage = z.object({
    data: z.array(graphMedia),
    paging: z
        .object({
            next: z.string().optional(),
            cursors: z.object({ after: z.string().optional() }).optional()
        })
        .optional()
})

export const graphInsights = z.object({
    data: z.array(
        z.object({
            name: z.string(),
            total_value: z.object({ value: z.unknown() }).optional(),
            values: z.array(z.object({ value: z.unknown() })).optional()
        })
    )
})

export const graphError = z.object({
    error: z
        .object({
            code: z.number().optional(),
            message: z.string().optional(),
            is_transient: z.boolean().optional()
        })
        .optional()
})

/** Allow only public Instagram links; provider payloads are never trusted as URLs. */
export function instagramPermalink(value: string | undefined): string | null {
    if (!value) {
        return null
    }
    try {
        const url = new URL(value)
        return url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            ["instagram.com", "www.instagram.com"].includes(url.hostname)
            ? value
            : null
    } catch {
        return null
    }
}
