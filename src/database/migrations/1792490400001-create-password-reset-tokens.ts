import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreatePasswordResetTokens1792490400001 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`password_reset_tokens\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`user_id\` int NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`token_hash\` varchar(64) NOT NULL,
  \`expires_at\` datetime NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`UQ_password_reset_hash\` (\`token_hash\`),
  KEY \`IX_password_reset_user\` (\`user_id\`),
  CONSTRAINT \`FK_password_reset_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS password_reset_tokens")
    }
}
