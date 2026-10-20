import { z } from "zod"

export const processSchema = z.object({ output: z.enum(["feed", "story"]) }).strict()
