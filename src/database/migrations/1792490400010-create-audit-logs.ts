import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateAuditLogs1792490400010 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`audit_logs\` (
  \`id\` varchar(36) NOT NULL,
  \`actor_type\` varchar(20) NOT NULL,
  \`actor_id\` int DEFAULT NULL,
  \`event\` varchar(80) NOT NULL,
  \`entity_type\` varchar(40) NOT NULL,
  \`entity_id\` varchar(128) NOT NULL,
  \`safe_details\` json NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS audit_logs")
    }
}
