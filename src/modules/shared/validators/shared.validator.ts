import { z } from "zod"
import { listQuerySchema } from "../../../core/validators/list-query.validator"

export const resourceId = z.string().uuid()

export const integrationId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/)

export const idempotencyKey = z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/)

export const outputs = z
    .array(z.enum(["feed", "story"]))
    .min(1)
    .max(2)
    .refine((a) => new Set(a).size === a.length)

export const querySchema = listQuerySchema.extend({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().max(150).optional(),
    status: z.string().max(40).optional(),
    days: z.coerce.number().int().min(1).max(365).optional(),
    batchId: resourceId.optional(),
    output: z.enum(["feed", "story"]).optional(),
    uploaderId: z.coerce.number().int().positive().optional()
})
