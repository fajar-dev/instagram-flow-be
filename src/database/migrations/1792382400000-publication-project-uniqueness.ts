import type { MigrationInterface, QueryRunner } from 'typeorm'
export class PublicationProjectUniqueness1792382400000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        // Remove only terminal attempts already preserved in the audit log by the preceding migration.
        await queryRunner.query(`DELETE p FROM publications p JOIN audit_logs a ON a.entity_id=p.id AND a.event='PUBLICATION_ATTEMPT_ARCHIVED' WHERE p.status IN ('FAILED','CANCELLED')`)
        const duplicates = await queryRunner.query(`SELECT j.batch_id FROM publications p JOIN drafts d ON d.id=p.draft_id JOIN jobs j ON j.id=d.job_id GROUP BY j.batch_id HAVING COUNT(*) > 1`)
        if (duplicates.length) throw new Error('Multiple publications exist for a project; reconcile records before migration')
        await queryRunner.query(`ALTER TABLE publications ADD batch_id varchar(36) NULL`)
        await queryRunner.query(`UPDATE publications p JOIN drafts d ON d.id=p.draft_id JOIN jobs j ON j.id=d.job_id SET p.batch_id=j.batch_id`)
        await queryRunner.query(`ALTER TABLE publications MODIFY batch_id varchar(36) NOT NULL, ADD UNIQUE KEY uq_publications_batch (batch_id)`)
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE publications DROP INDEX uq_publications_batch, DROP COLUMN batch_id`)
    }
}
