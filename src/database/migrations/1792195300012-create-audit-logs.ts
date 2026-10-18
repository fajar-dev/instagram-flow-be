import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateAuditLogs1792195300012 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`audit_logs\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`actor_type\` varchar(20) NOT NULL,
\`actor_id\` int NULL,
\`event\` varchar(80) NOT NULL,
\`entity_type\` varchar(40) NOT NULL,
\`entity_id\` varchar(128) NOT NULL,
\`safe_details\` json NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS audit_logs")
    }
}
