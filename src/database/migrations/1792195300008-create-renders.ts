import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateRenders1792195300008 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`renders\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`ai_result_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`ai_result_id\`) REFERENCES \`ai_results\` (\`id\`) ON DELETE RESTRICT,
\`placement\` varchar(20) NOT NULL,
\`format\` varchar(10) NOT NULL,
\`width\` int NOT NULL,
\`height\` int NOT NULL,
\`storage_key\` varchar(255) NOT NULL,
\`asset_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`id\`) ON DELETE RESTRICT,
\`render_state\` varchar(30) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS renders")
    }
}
