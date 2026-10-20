import { z } from "zod"
import { publishContentSchema } from "../../content-review/validators/draft.validator"

export const publicationSchema = z
    .object({
        expectedContentHash: z.string().length(64),
        content: publishContentSchema.strict(),
        accountKey: z.string().regex(/^[a-z0-9_-]{1,64}$/),
        source: z.enum(["photo", "design"]),
        placement: z.enum(["feed", "story"]),
        scheduledAt: z.string().datetime({ offset: true }).nullable()
    })
    .strict()

export type PublicationInput = z.infer<typeof publicationSchema>
