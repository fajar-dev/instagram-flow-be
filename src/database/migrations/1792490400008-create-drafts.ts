import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateDrafts1792490400008 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`drafts\` (
  \`id\` varchar(36) NOT NULL,
  \`job_id\` varchar(36) NOT NULL,
  \`decision_status\` varchar(40) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  \`title\` varchar(300) NOT NULL,
  \`caption\` text NOT NULL,
  \`hashtags\` json NOT NULL,
  \`location\` varchar(200) NOT NULL,
  \`activity\` varchar(200) NOT NULL,
  \`content_hash\` varchar(64) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`job_id\` (\`job_id\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`drafts_ibfk_1\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS drafts")
    }
}
