import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateJobs1792195300005 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`jobs\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`batch_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`batch_id\`) REFERENCES \`batches\` (\`id\`) ON DELETE RESTRICT,
\`requested_outputs\` json NOT NULL,
\`status\` varchar(40) NOT NULL,
\`attempt_no\` int NOT NULL,
\`last_execution_id\` varchar(128) NULL,
\`started_at\` datetime(6) NULL,
\`completed_at\` datetime(6) NULL,
\`error_code\` varchar(80) NULL,
\`safe_error\` varchar(500) NULL,
\`retryable\` boolean NOT NULL,
\`retry_of_job_id\` varchar(36) NULL,
FOREIGN KEY (\`retry_of_job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT,
\`created_by\` int NOT NULL,
FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`idempotency_key\` varchar(128) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`batch_id\`, \`idempotency_key\`),
INDEX (\`status\`, \`created_at\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS jobs")
    }
}
