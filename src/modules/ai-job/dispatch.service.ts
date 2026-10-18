import { config } from '../../config/config';
import type { IWorkflowRepository } from '../shared/interfaces/workflow.repository.interface';
import { WorkflowContextService } from '../shared/context.service';
import { SettingsService } from '../integration/settings.service';
import { toLegacy } from './workflow/adapters/n8n.adapter';
export interface IWebhookTransport {
    send(payload: unknown): Promise<number>;
}
export class JobDispatcher {
    constructor(private readonly repository: IWorkflowRepository, private readonly context: WorkflowContextService, private readonly settings: SettingsService, private readonly transport: IWebhookTransport) { }
    async tick() {
        await this.watchdog();
        if (!await this.settings.dispatchEnabled() || !this.settings.isReady())
            return;
        for (const dispatchId of await this.repository.dueDispatchIds()) {
            const lease = await this.repository.transaction(async (store) => {
                const candidate = await store.get('dispatch', dispatchId);
                if (!candidate) return;
                const job = await this.context.job(candidate.jobId, store, true);
                const dispatch = await store.get('dispatch', dispatchId, true);
                if (!dispatch || !['PENDING', 'SENDING'].includes(dispatch.status) || dispatch.nextRetryAt > new Date() || dispatch.lockedUntil && dispatch.lockedUntil > new Date())
                    return null;
                if (!job || !['QUEUED', 'DISPATCHED'].includes(job.status)) {
                    await store.save('dispatch', { ...dispatch, status: 'SENT', lockedUntil: null });
                    return null;
                }
                await store.save('dispatch', {
                    ...dispatch, status: 'SENDING', attemptNo: dispatch.attemptNo + 1, lockedUntil: new Date(Date.now() + config.n8n.timeoutMs + 30000)
                });
                return { dispatch, job, attempt: dispatch.attemptNo + 1 };
            });
            if (!lease)
                continue;
            const payload = {
                eventId: lease.dispatch.eventId, jobId: lease.job.id, batchId: lease.job.batchId, requestedBy: String(lease.job.createdBy), requestedOutputs: lease.job.requestedOutputs
            };
            let status = 0;
            try {
                status = await this.transport.send(config.n8n.contract === 'legacy' ? toLegacy(payload) : payload);
            }
            catch { /* retry without logging URLs or headers */ }
            await this.repository.transaction(async (store) => {
                const candidate = await store.get('dispatch', dispatchId);
                if (!candidate) return;
                const job = await this.context.job(candidate.jobId, store, true);
                const dispatch = await store.get('dispatch', dispatchId, true);
                if (!dispatch || dispatch.attemptNo !== lease.attempt)
                    return;
                const accepted = status >= 200 && status < 300 || !['QUEUED', 'DISPATCHED'].includes(job.status);
                const exhausted = !accepted && lease.attempt >= config.jobs.retryMax;
                await store.save('dispatch', {
                    ...dispatch, status: accepted ? 'SENT' : exhausted ? 'FAILED' : 'PENDING', lockedUntil: null, lastResponseCode: status || null, sentAt: accepted ? new Date() : null, nextRetryAt: new Date(Date.now() + config.jobs.retryBackoff * 1000 * 2 ** Math.min(lease.attempt - 1, 10))
                });
                if (accepted && job.status === 'QUEUED')
                    await store.save('job', { ...job, status: 'DISPATCHED' });
                if (exhausted && ['QUEUED', 'DISPATCHED'].includes(job.status)) {
                    await store.save('job', {
                        ...job, status: 'FAILED', errorCode: 'DISPATCH_FAILED', safeError: 'Webhook delivery failed. Check integration settings and retry.', completedAt: new Date(), retryable: true
                    });
                    await store.save('batch', { id: job.batchId, status: 'FAILED' });
                }
                await this.context.audit(store, null, accepted ? 'JOB_DISPATCHED' : 'DISPATCH_FAILED', 'job', job.id, { attempt: lease.attempt, responseCode: status });
            });
        }
    }
    private async watchdog() {
        for (const jobId of await this.repository.expiredJobIds(config.jobs.processingTimeout)) {
            await this.repository.transaction(async (store) => {
                const job = await this.context.job(jobId, store, true);
                if (!['PROCESSING', 'DISPATCHED'].includes(job.status) || (job.startedAt || job.updatedAt).getTime() > Date.now() - config.jobs.processingTimeout * 1000)
                    return;
                await store.save('job', {
                    ...job, status: 'FAILED', errorCode: 'PROCESSING_TIMEOUT', safeError: 'Workflow timed out. Inspect n8n before retrying.', completedAt: new Date(), retryable: true
                });
                await store.save('batch', { id: job.batchId, status: 'FAILED' });
                await this.context.audit(store, null, 'JOB_TIMEOUT', 'job', jobId);
            });
        }
    }
}
