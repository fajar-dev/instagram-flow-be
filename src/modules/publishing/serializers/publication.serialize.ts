import type { Context } from 'hono'
import { translate } from '../../../core/helpers/i18n'
import type { Publication } from '../entities/publication.entity'
export class PublicationSerializer {
    static single(p: Publication, c: Context) {
        return { id: p.id, draftId: p.draftId, revisionId: p.revisionId, accountKey: p.accountKey,
            accountLabel: p.snapshot.accountLabel, revisionNo: p.snapshot.revisionNo,
            caption: p.snapshot.caption, source: p.snapshot.source, placement: p.snapshot.placement,
            status: p.status, scheduledAt: p.scheduledAt, publishedAt: p.publishedAt,
            mediaId: p.mediaId, permalink: p.permalink, safeError: p.safeError ? translate(c, p.safeError) : null, createdAt: p.createdAt }
    }
    static collection(rows: Publication[], c: Context) { return rows.map(row => this.single(row, c)) }
}
