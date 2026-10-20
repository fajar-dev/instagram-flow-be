import { z } from "zod"
import { publishContentSchema } from "../../content-review/validators/draft.validator"

const fields = {
    expectedContentHash: z.string().length(64),
    accountKey: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    source: z.enum(["photo", "design"]),
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
            content: publishContentSchema
                .extend({ caption: z.literal(""), hashtags: z.array(z.string()).length(0) })
                .strict()
        })
        .strict()
])

export type PublicationInput = z.infer<typeof publicationSchema>
