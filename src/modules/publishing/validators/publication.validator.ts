import { z } from 'zod'
import { resourceId } from '../../shared/validators/shared.validator'
export const publicationSchema = z.object({
    revisionId: resourceId,
    accountKey: z.string().regex(/^[a-z0-9_-]{1,64}$/),
    source: z.enum(['photo', 'design']), placement: z.enum(['feed', 'story']),
    scheduledAt: z.string().datetime({ offset: true }).nullable()
}).strict()
export type PublicationInput = z.infer<typeof publicationSchema>
