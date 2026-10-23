import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateRejections1792490400009 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`rejections\` (
  \`id\` varchar(36) NOT NULL,
  \`draft_id\` varchar(36) NOT NULL,
  \`rejected_by\` int NOT NULL,
  \`notes\` text NOT NULL,
  \`content_hash\` varchar(64) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`draft_id\` (\`draft_id\`),
  KEY \`rejected_by\` (\`rejected_by\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`rejections_ibfk_1\` FOREIGN KEY (\`draft_id\`) REFERENCES \`drafts\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`rejections_ibfk_3\` FOREIGN KEY (\`rejected_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS rejections")
    }
}
