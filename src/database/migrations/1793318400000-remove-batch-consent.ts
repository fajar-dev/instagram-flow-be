import type { MigrationInterface, QueryRunner } from "typeorm"

export class RemoveBatchConsent1793318400000 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE batches
            DROP FOREIGN KEY batches_ibfk_2,
            DROP INDEX consent_by,
            DROP COLUMN publication_permission,
            DROP COLUMN consent_by,
            DROP COLUMN consent_at`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        // New batches have no recorded confirmation; do not invent historical consent.
        await queryRunner.query(`ALTER TABLE batches
            ADD publication_permission tinyint(1) NOT NULL DEFAULT 0,
            ADD consent_by int NULL,
            ADD consent_at datetime(6) NULL,
            ADD KEY consent_by (consent_by),
            ADD CONSTRAINT batches_ibfk_2 FOREIGN KEY (consent_by) REFERENCES users(id) ON DELETE RESTRICT`)
    }
}
