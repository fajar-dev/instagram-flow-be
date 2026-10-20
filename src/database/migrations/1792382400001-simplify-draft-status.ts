import type { MigrationInterface, QueryRunner } from "typeorm"

export class SimplifyDraftStatus1792382400001 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE drafts SET review_status='READY_FOR_REVIEW' WHERE review_status IN ('IN_REVIEW','REVISION_REQUESTED','APPROVED_INTERNAL')`
        )
        await queryRunner.query(
            `UPDATE drafts d JOIN publications p ON p.draft_id=d.id SET d.review_status=IF(p.status='CANCELLED','REJECTED','PUBLISH')`
        )
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        const [row] = await queryRunner.query("SELECT COUNT(*) AS total FROM drafts")
        if (Number(row.total)) {
            throw new Error("Restore a backup to roll back normalized historical data")
        }
    }
}
