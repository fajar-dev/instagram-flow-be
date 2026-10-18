import { RevisionSerializer } from './serializers/revision.serialize';
import { DraftSerializer } from './serializers/draft.serialize';
import { ApiResponse } from '../../core/helpers/response';
import type { Context } from 'hono';
import { DraftService } from './draft.service';
import { actor, id } from '../shared/request-context';
export class DraftController {
    constructor(private readonly service: DraftService) { }
    async edit(c: Context) {
        const result = await this.service.edit(actor(c), id(c, 'draftId'), c.req.valid('json' as never));
        return ApiResponse.success(c, RevisionSerializer.single(result));
    }
    async review(c: Context) {
        const result = await this.service.review(actor(c), id(c, 'draftId'), c.req.valid('json' as never));
        return ApiResponse.success(c, DraftSerializer.single(result));
    }
}
