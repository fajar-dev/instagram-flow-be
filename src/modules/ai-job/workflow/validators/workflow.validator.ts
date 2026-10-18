import { z } from 'zod';
import { resourceId, integrationId } from '../../../shared/validators/shared.validator';
export const claimSchema = z.object({ executionId: integrationId, eventId: resourceId });
export const resultSchema = z.object({
    jobId: resourceId, executionId: integrationId, resultVersion: z.number().int().min(1).max(1000), status: z.literal('READY_FOR_REVIEW'),
    selectedAssetIds: z.array(resourceId).min(1).max(5),
    rankings: z.array(z.object({ assetId: resourceId, score: z.number().min(0).max(100), reason: z.string().max(2000) }).passthrough()).min(1).max(30),
    title: z.string().trim().min(1).max(300), caption: z.string().trim().min(1).max(10000), hashtags: z.array(z.string().max(100)).max(30),
    renders: z.array(z.object({
        placement: z.enum(['feed', 'story']), format: z.literal('svg'), width: z.literal(1080), height: z.union([z.literal(1350), z.literal(1920)]), svg: z.string().max(500000), assetId: resourceId
    })).min(1).max(2),
});
export const failureSchema = z.object({
    executionId: integrationId, stage: z.string().max(80), errorCode: z.string().max(80), safeMessage: z.string().max(1000), retryable: z.boolean()
});
export type ResultInput = z.infer<typeof resultSchema>;
export type FailureInput = z.infer<typeof failureSchema>;
