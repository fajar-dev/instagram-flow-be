import { z } from 'zod';
import { resourceId } from '../../shared/validators/shared.validator';
export const revisionSchema = z.object({
    expectedRevisionId: resourceId, primaryAssetId: resourceId, title: z.string().trim().min(1).max(300),
    caption: z.string().trim().min(1).max(10000), hashtags: z.array(z.string().max(100)).max(30),
    location: z.string().trim().min(1).max(200), activity: z.string().trim().min(1).max(200),
});
export const reviewSchema = z.object({
    revisionId: resourceId, contentHash: z.string().length(64), decision: z.enum(['IN_REVIEW', 'APPROVED_INTERNAL', 'REVISION_REQUESTED', 'REJECTED']), notes: z.string().max(2000).default('')
});
export type RevisionInput = z.infer<typeof revisionSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
