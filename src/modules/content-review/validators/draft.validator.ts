import { z } from "zod"
import { resourceId } from "../../shared/validators/shared.validator"

export const publishContentSchema = z.object({
    primaryAssetId: resourceId,
    title: z.string().trim().min(1).max(300),
    caption: z.string().trim().min(1).max(10000),
    hashtags: z.array(z.string().max(100)).max(30),
    location: z.string().trim().min(1).max(200),
    activity: z.string().trim().min(1).max(200)
})

export const rejectSchema = z
    .object({
        contentHash: z.string().length(64),
        notes: z.string().max(2000).default("")
    })
    .strict()

export type PublishContentInput = z.infer<typeof publishContentSchema>

export type RejectInput = z.infer<typeof rejectSchema>
