import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateJobDispatches1792490400005 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`job_dispatches\` (
  \`id\` varchar(36) NOT NULL,
  \`job_id\` varchar(36) NOT NULL,
  \`event_id\` varchar(36) NOT NULL,
  \`status\` varchar(40) NOT NULL,
  \`attempt_no\` int NOT NULL,
  \`next_retry_at\` datetime(6) NOT NULL,
  \`locked_until\` datetime(6) DEFAULT NULL,
  \`last_response_code\` int DEFAULT NULL,
  \`sent_at\` datetime(6) DEFAULT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`event_id\` (\`event_id\`),
  UNIQUE KEY \`job_id\` (\`job_id\`),
  KEY \`status\` (\`status\`,\`created_at\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`job_dispatches_ibfk_1\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS job_dispatches")
    }
}
