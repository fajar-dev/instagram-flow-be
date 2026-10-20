import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateSettings1792490400011 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`settings\` (
  \`id\` varchar(36) NOT NULL,
  \`key\` varchar(100) NOT NULL,
  \`non_secret_value\` json NOT NULL,
  \`updated_by\` int NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`key\` (\`key\`),
  KEY \`updated_by\` (\`updated_by\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`settings_ibfk_1\` FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS settings")
    }
}
