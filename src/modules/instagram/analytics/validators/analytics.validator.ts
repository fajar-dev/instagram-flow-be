import { z } from "zod"

export const analyticsQuery = z.object({
    period: z
        .enum(["today", "this_week", "this_month", "last_7_days", "last_30_days"])
        .default("this_week")
})

export const analyticsPostsQuery = z.object({
    after: z
        .string()
        .min(1)
        .max(2048)
        .regex(/^[A-Za-z0-9_=-]+$/)
        .optional()
})
