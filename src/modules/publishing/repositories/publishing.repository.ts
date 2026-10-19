import { AppDataSource } from '../../../config/database'
import { TypeOrmWorkflowRepository } from '../../shared/repositories/workflow.repository'
import { Publication } from '../entities/publication.entity'
import type { IPublishingRepository } from '../interfaces/publishing.repository.interface'
export class TypeOrmPublishingRepository extends TypeOrmWorkflowRepository implements IPublishingRepository {
    async duePublicationIds() {
        const rows = await AppDataSource.getRepository(Publication).createQueryBuilder('p')
            .where("p.status IN ('QUEUED','SCHEDULED','PROCESSING','PUBLISHING','UNKNOWN')")
            .andWhere('p.next_attempt_at <= :now AND (p.locked_until IS NULL OR p.locked_until < :now)', { now: new Date() })
            .orderBy('p.next_attempt_at', 'ASC').take(20).getMany()
        return rows.map(row => row.id)
    }
}
