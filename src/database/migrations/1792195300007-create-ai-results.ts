import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateAiResults1792195300007 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ai_results\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`job_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT,
\`execution_id\` varchar(128) NOT NULL,
\`result_version\` int NOT NULL,
\`rankings\` json NOT NULL,
\`selected_asset_ids\` json NOT NULL,
\`raw_caption\` text NOT NULL,
\`raw_title\` varchar(300) NOT NULL,
\`raw_hashtags\` json NOT NULL,
\`raw_payload_hash\` varchar(64) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`job_id\`, \`execution_id\`, \`result_version\`),
UNIQUE (\`job_id\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS ai_results")
    }
}
