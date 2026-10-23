import { z } from "zod"
import { publishContentSchema } from "../../content-draft/validators/draft.validator"

const fields = {
    expectedContentHash: z.string().length(64),
    accountKey: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    renderIds: z
        .array(z.string().uuid())
        .min(1)
        .max(10)
        .refine((ids) => new Set(ids).size === ids.length),
    scheduledAt: z.string().datetime({ offset: true }).nullable()
}

export const publicationSchema = z.discriminatedUnion("placement", [
    z
        .object({ ...fields, placement: z.literal("feed"), content: publishContentSchema.strict() })
        .strict(),
    z
        .object({
            ...fields,
            placement: z.literal("story"),
            renderIds: z.array(z.string().uuid()).length(1),
            content: publishContentSchema
                .extend({ caption: z.literal(""), hashtags: z.array(z.string()).length(0) })
                .strict()
        })
        .strict()
])

export type PublicationInput = z.infer<typeof publicationSchema>
