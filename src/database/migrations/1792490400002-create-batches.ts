import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateBatches1792490400002 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`batches\` (
  \`id\` varchar(36) NOT NULL,
  \`uploader_id\` int NOT NULL,
  \`project_name\` varchar(150) NOT NULL,
  \`activity\` varchar(200) NOT NULL,
  \`location\` varchar(200) NOT NULL,
  \`documentation_date\` date NOT NULL,
  \`description\` text NOT NULL,
  \`client_name\` varchar(200) NOT NULL,
  \`publication_permission\` tinyint(1) NOT NULL,
  \`consent_by\` int NOT NULL,
  \`consent_at\` datetime(6) NOT NULL,
  \`status\` varchar(40) NOT NULL,
  \`idempotency_key\` varchar(128) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uploader_id\` (\`uploader_id\`,\`idempotency_key\`),
  KEY \`consent_by\` (\`consent_by\`),
  KEY \`status\` (\`status\`,\`created_at\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`batches_ibfk_1\` FOREIGN KEY (\`uploader_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`batches_ibfk_2\` FOREIGN KEY (\`consent_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS batches")
    }
}
