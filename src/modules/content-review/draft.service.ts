import { BadRequestException, ConflictException, NotFoundException } from '../../core/exceptions/base';
import type { User } from '../user/entities/user.entity';
import type { IWorkflowRepository } from '../shared/interfaces/workflow.repository.interface';
import type { RevisionInput, ReviewInput } from './validators/draft.validator';
import { contentHash, id } from '../shared/workflow.helpers';
import { WorkflowContextService } from '../shared/context.service';
export class DraftService {
    constructor(private readonly repository: IWorkflowRepository, private readonly context: WorkflowContextService) { }
    async edit(actor: User, draftId: string, input: RevisionInput) {

        return this.repository.transaction(async (store) => {
            const draft = await store.get('draft', draftId, true);
            if (!draft)
                throw new NotFoundException('Draft not found');
            await this.context.job(draft.jobId, store);
            if (draft.currentRevisionId !== input.expectedRevisionId)
                throw new ConflictException('Revision is stale; reload before saving');
            const asset = await store.get('asset', input.primaryAssetId);
            const job = await store.get('job', draft.jobId);
            if (!asset || asset.deletedAt || asset.batchId !== job!.batchId)
                throw new BadRequestException('Invalid primary asset');
            const current = await store.get('revision', draft.currentRevisionId!);
            const { expectedRevisionId, ...content } = input;
            const revision = await store.save('revision', {
                id: id(), draftId, revisionNo: current!.revisionNo + 1, ...content, contentHash: contentHash(content), createdBy: actor.id
            });
            await store.save('draft', { ...draft, currentRevisionId: revision.id, reviewStatus: 'READY_FOR_REVIEW' });
            await this.context.audit(store, actor, 'DRAFT_EDITED', 'draft', draftId, { revisionId: revision.id });
            return revision;
        });
    }
    async review(actor: User, draftId: string, input: ReviewInput) {

        return this.repository.transaction(async (store) => {
            const draft = await store.get('draft', draftId, true);
            if (!draft)
                throw new NotFoundException('Draft not found');
            const revision = await store.get('revision', input.revisionId);
            if (draft.currentRevisionId !== input.revisionId || revision?.contentHash !== input.contentHash)
                throw new ConflictException('Cannot review a stale revision');
            if (draft.reviewStatus === input.decision)
                return draft;
            await store.save('review', {
                id: id(), draftId, revisionId: input.revisionId, reviewerId: actor.id, decision: input.decision, notes: input.notes, contentHash: input.contentHash
            });
            const saved = await store.save('draft', { ...draft, reviewStatus: input.decision });
            await this.context.audit(store, actor, 'DRAFT_REVIEWED', 'draft', draftId, { decision: input.decision, revisionId: input.revisionId });
            return saved;
        });
    }
}
