import type { Context } from 'hono';
import { ApiResponse } from '../../core/helpers/response';
import { BatchSerializer } from './serializers/batch.serialize';
import { BatchService } from './batch.service';
import { actor, id, key } from '../shared/request-context';
export class BatchController {
    constructor(private readonly service: BatchService) { }
    limits(c: Context) {
        return ApiResponse.success(c, this.service.uploadLimits())
    }

    async createBatch(c: Context) {
        return ApiResponse.success(c, BatchSerializer.single(await this.service.createBatch(actor(c), c.req.valid('json' as never), key(c))), 'Success', 201);
    }
    async batch(c: Context) {
        const result = await this.service.getById(id(c, 'batchId'));
        return ApiResponse.success(c, BatchSerializer.single(result));
    }
}
