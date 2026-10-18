import type { Context } from 'hono';
import { claimSchema, resultSchema, failureSchema } from './validators/workflow.validator';
import { config } from '../../../config/config';
import { fromLegacy, toLegacy } from './adapters/n8n.adapter';
import { WorkflowService } from './workflow.service';
import { id } from '../../shared/request-context';
export class WorkflowController {
    constructor(private readonly service: WorkflowService) { }
    async callback(c: Context, operation: 'claim' | 'manifest' | 'result' | 'failure') {
        const jobId = id(c, 'jobId');
        if (operation === 'manifest') {
            const manifest = await this.service.manifest(jobId);
            return c.json(config.n8n.contract === 'legacy' ? toLegacy(manifest) : manifest);
        }
        const raw = c.req.valid('json' as never);
        const input = config.n8n.contract === 'legacy' ? fromLegacy(raw) : raw;
        if (operation === 'claim') {
            const value = claimSchema.parse(input);
            return c.json(await this.service.claim(jobId, value.executionId, value.eventId));
        }
        if (operation === 'result')
            return c.json(await this.service.result(jobId, resultSchema.parse(input)));
        return c.json(await this.service.failure(jobId, failureSchema.parse(input)));
    }
}
