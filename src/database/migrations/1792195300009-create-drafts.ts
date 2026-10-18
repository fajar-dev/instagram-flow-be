import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateDrafts1792195300009 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`drafts\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`job_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT,
\`current_revision_id\` varchar(36) NULL,
\`review_status\` varchar(40) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`job_id\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS drafts")
    }
}
