import { ApiResponse } from '../../core/helpers/response';
import type { Context } from 'hono';
import { SettingsService } from './settings.service';
import { actor } from '../shared/request-context';
export class SettingsController {
    constructor(private readonly service: SettingsService) { }
    async settings(c: Context) {
        return ApiResponse.success(c, await this.service.settings());
    }
    async updateSettings(c: Context) {
        return ApiResponse.success(c, await this.service.updateSettings(actor(c), (c.req.valid('json' as never) as { dispatchEnabled: boolean }).dispatchEnabled));
    }
}
