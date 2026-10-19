import { lockDraftProject } from '../shared/draft-project';
import { BadRequestException, ConflictException } from '../../core/exceptions/base';
import type { User } from '../user/entities/user.entity';
import type { IWorkflowRepository } from '../shared/interfaces/workflow.repository.interface';
import type { RevisionInput, RejectInput } from './validators/draft.validator';
import { contentHash, id } from '../shared/workflow.helpers';
import { WorkflowContextService } from '../shared/context.service';
export class DraftService {
    constructor(private readonly repository: IWorkflowRepository, private readonly context: WorkflowContextService) { }
    async edit(actor: User, draftId: string, input: RevisionInput) {

        return this.repository.transaction(async (store) => {
            const { draft, batch } = await lockDraftProject(store, draftId);
            await this.context.job(draft.jobId, store);
            if (draft.currentRevisionId !== input.expectedRevisionId)
                throw new ConflictException('Revision is stale; reload before saving');
            const asset = await store.get('asset', input.primaryAssetId);
            const job = await store.get('job', draft.jobId);
            if (!asset || asset.deletedAt || asset.batchId !== job!.batchId)
                throw new BadRequestException('Invalid primary asset');
            if (draft.reviewStatus !== 'READY_FOR_REVIEW') throw new ConflictException('Only ready content can be edited');
            const current = await store.get('revision', draft.currentRevisionId!);
            const { expectedRevisionId, ...content } = input;
            if ((await store.find('publication', { batchId: batch.id })).length) throw new ConflictException('Project already has a publication');
            const revision = await store.save('revision', {
                id: id(), draftId, revisionNo: current!.revisionNo + 1, ...content, contentHash: contentHash(content), createdBy: actor.id
            });
            await store.save('draft', { ...draft, currentRevisionId: revision.id, reviewStatus: 'READY_FOR_REVIEW' });
            await this.context.audit(store, actor, 'DRAFT_EDITED', 'draft', draftId, { revisionId: revision.id });
            return revision;
        });
    }
    async reject(actor: User, draftId: string, input: RejectInput) {

        return this.repository.transaction(async (store) => {
            const { draft, batch } = await lockDraftProject(store, draftId);
            const revision = await store.get('revision', input.revisionId);
            if (draft.currentRevisionId !== input.revisionId || revision?.contentHash !== input.contentHash)
                throw new ConflictException('Cannot reject a stale revision');
            if ((await store.find('publication', { batchId: batch.id })).length) throw new ConflictException('Project already has a publication');
            if (draft.reviewStatus === 'REJECTED')
                return draft;
            if (draft.reviewStatus !== 'READY_FOR_REVIEW') throw new ConflictException('Only ready content can be rejected');
            await store.save('review', {
                id: id(), draftId, revisionId: input.revisionId, reviewerId: actor.id, decision: 'REJECTED', notes: input.notes, contentHash: input.contentHash
            });
            const saved = await store.save('draft', { ...draft, reviewStatus: 'REJECTED' });
            await this.context.audit(store, actor, 'DRAFT_REJECTED', 'draft', draftId, { decision: 'REJECTED', revisionId: input.revisionId });
            return saved;
        });
    }
}
