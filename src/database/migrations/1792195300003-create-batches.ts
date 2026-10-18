import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateBatches1792195300003 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`batches\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`uploader_id\` int NOT NULL,
FOREIGN KEY (\`uploader_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`project_name\` varchar(150) NOT NULL,
\`activity\` varchar(200) NOT NULL,
\`location\` varchar(200) NOT NULL,
\`documentation_date\` date NOT NULL,
\`description\` text NOT NULL,
\`client_name\` varchar(200) NOT NULL,
\`publication_permission\` boolean NOT NULL,
\`consent_by\` int NOT NULL,
FOREIGN KEY (\`consent_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`consent_at\` datetime(6) NOT NULL,
\`status\` varchar(40) NOT NULL,
\`idempotency_key\` varchar(128) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`uploader_id\`, \`idempotency_key\`),
INDEX (\`status\`, \`created_at\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS batches")
    }
}
