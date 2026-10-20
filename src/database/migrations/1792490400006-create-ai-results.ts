import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateAiResults1792490400006 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ai_results\` (
  \`id\` varchar(36) NOT NULL,
  \`job_id\` varchar(36) NOT NULL,
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
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`job_id\` (\`job_id\`,\`execution_id\`,\`result_version\`),
  UNIQUE KEY \`job_id_2\` (\`job_id\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`ai_results_ibfk_1\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS ai_results")
    }
}
