import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateJobs1792490400004 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`jobs\` (
  \`id\` varchar(36) NOT NULL,
  \`batch_id\` varchar(36) NOT NULL,
  \`requested_outputs\` json NOT NULL,
  \`status\` varchar(40) NOT NULL,
  \`attempt_no\` int NOT NULL,
  \`last_execution_id\` varchar(128) DEFAULT NULL,
  \`started_at\` datetime(6) DEFAULT NULL,
  \`completed_at\` datetime(6) DEFAULT NULL,
  \`error_code\` varchar(80) DEFAULT NULL,
  \`safe_error\` varchar(500) DEFAULT NULL,
  \`retryable\` tinyint(1) NOT NULL,
  \`retry_of_job_id\` varchar(36) DEFAULT NULL,
  \`created_by\` int NOT NULL,
  \`idempotency_key\` varchar(128) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`batch_id\` (\`batch_id\`,\`idempotency_key\`),
  KEY \`retry_of_job_id\` (\`retry_of_job_id\`),
  KEY \`created_by\` (\`created_by\`),
  KEY \`status\` (\`status\`,\`created_at\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`jobs_ibfk_1\` FOREIGN KEY (\`batch_id\`) REFERENCES \`batches\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`jobs_ibfk_2\` FOREIGN KEY (\`retry_of_job_id\`) REFERENCES \`jobs\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`jobs_ibfk_3\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS jobs")
    }
}
