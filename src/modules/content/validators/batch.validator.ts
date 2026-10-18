import { z } from 'zod';
export const batchSchema = z.object({
    projectName: z.string().trim().min(3).max(150), activity: z.string().trim().min(3).max(200),
    location: z.string().trim().min(3).max(200), documentationDate: z.iso.date(),
    description: z.string().max(2000).default(''), clientName: z.string().max(200).default(''),
    publicationPermission: z.literal(true),
});
export type BatchInput = z.infer<typeof batchSchema>;
