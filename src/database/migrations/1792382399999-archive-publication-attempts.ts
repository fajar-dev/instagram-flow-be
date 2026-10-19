import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Preserve superseded, definitively failed attempts before enforcing one project/one post. */
export class ArchivePublicationAttempts1792382399999 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        const groups = await queryRunner.query(`SELECT j.batch_id FROM publications p JOIN drafts d ON d.id=p.draft_id JOIN jobs j ON j.id=d.job_id GROUP BY j.batch_id HAVING COUNT(*)>1`)
        for (const group of groups) {
            const rows = await queryRunner.query(`SELECT p.* FROM publications p JOIN drafts d ON d.id=p.draft_id JOIN jobs j ON j.id=d.job_id WHERE j.batch_id=?`, [group.batch_id])
            if (rows.filter((row: { status: string }) => row.status === 'PUBLISHED').length !== 1 || rows.some((row: { status: string }) => !['PUBLISHED', 'FAILED', 'CANCELLED'].includes(row.status))) {
                throw new Error('Conflicting live publications require manual reconciliation before migration')
            }
            for (const row of rows.filter((row: { status: string }) => row.status !== 'PUBLISHED')) {
                const [existing] = await queryRunner.query(`SELECT id FROM audit_logs WHERE event='PUBLICATION_ATTEMPT_ARCHIVED' AND entity_id=?`, [row.id])
                if (!existing) await queryRunner.query(`INSERT INTO audit_logs (id, actor_type, actor_id, event, entity_type, entity_id, safe_details) VALUES (UUID(),'SERVICE',NULL,'PUBLICATION_ATTEMPT_ARCHIVED','publication',?,?)`, [row.id, JSON.stringify({ batchId: group.batch_id, attempt: row })])
            }
        }
    }
    async down(): Promise<void> { /* Audit history intentionally survives rollback. */ }
}
