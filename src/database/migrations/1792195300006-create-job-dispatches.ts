import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateJobDispatches1792195300006 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`job_dispatches\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`job_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT,
\`event_id\` varchar(36) NOT NULL,
\`status\` varchar(40) NOT NULL,
\`attempt_no\` int NOT NULL,
\`next_retry_at\` datetime(6) NOT NULL,
\`locked_until\` datetime(6) NULL,
\`last_response_code\` int NULL,
\`sent_at\` datetime(6) NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`event_id\`),
UNIQUE (\`job_id\`),
INDEX (\`status\`, \`created_at\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS job_dispatches")
    }
}
