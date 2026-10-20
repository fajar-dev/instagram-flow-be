import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateRenders1792490400007 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`renders\` (
  \`id\` varchar(36) NOT NULL,
  \`ai_result_id\` varchar(36) NOT NULL,
  \`placement\` varchar(20) NOT NULL,
  \`format\` varchar(10) NOT NULL,
  \`width\` int NOT NULL,
  \`height\` int NOT NULL,
  \`storage_key\` varchar(255) NOT NULL,
  \`asset_id\` varchar(36) NOT NULL,
  \`render_state\` varchar(30) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`ai_result_id\` (\`ai_result_id\`),
  KEY \`asset_id\` (\`asset_id\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`renders_ibfk_1\` FOREIGN KEY (\`ai_result_id\`) REFERENCES \`ai_results\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`renders_ibfk_2\` FOREIGN KEY (\`asset_id\`) REFERENCES \`assets\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS renders")
    }
}
