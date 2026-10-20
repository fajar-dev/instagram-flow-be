import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateAssets1792490400003 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`assets\` (
  \`id\` varchar(36) NOT NULL,
  \`batch_id\` varchar(36) NOT NULL,
  \`original_storage_key\` varchar(255) NOT NULL,
  \`safe_preview_storage_key\` varchar(255) NOT NULL,
  \`mime\` varchar(50) NOT NULL,
  \`byte_size\` int NOT NULL,
  \`width\` int NOT NULL,
  \`height\` int NOT NULL,
  \`sha256\` varchar(64) NOT NULL,
  \`deleted_at\` datetime(6) DEFAULT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`batch_id\` (\`batch_id\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`assets_ibfk_1\` FOREIGN KEY (\`batch_id\`) REFERENCES \`batches\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS assets")
    }
}
