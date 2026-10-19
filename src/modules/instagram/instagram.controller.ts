import type { Context } from 'hono'
import { ApiResponse } from '../../core/helpers/response'
import { BadRequestException } from '../../core/exceptions/base'
import { InstagramService } from './instagram.service'
import type { IInstagramApi } from './interfaces/instagram.interface'
export class InstagramController {
    constructor(private readonly accountsService: InstagramService, private readonly api: IInstagramApi) {}
    async index(c: Context) { return ApiResponse.success(c, await this.accountsService.accounts()) }
    async verify(c: Context) {
        try { return ApiResponse.success(c, await this.api.profile(c.req.param('accountKey')!)) }
        catch { throw new BadRequestException('Instagram account verification failed; check credentials and permissions') }
    }
}
