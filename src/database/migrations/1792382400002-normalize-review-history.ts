import type { MigrationInterface, QueryRunner } from 'typeorm'
export class NormalizeReviewHistory1792382400002 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE reviews SET notes=CONCAT('[Legacy decision: ',decision,'] ',COALESCE(notes,'')), decision='READY_FOR_REVIEW' WHERE decision IN ('IN_REVIEW','REVISION_REQUESTED','APPROVED_INTERNAL')`)
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        const [row] = await queryRunner.query('SELECT COUNT(*) AS total FROM reviews')
        if (Number(row.total)) throw new Error('Restore a backup to roll back normalized historical data')
    }
}
