import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateJobNotifications1792490400013 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE job_notifications (
            id varchar(36) NOT NULL,
            job_id varchar(36) NOT NULL,
            project_name varchar(150) NOT NULL,
            output varchar(10) NOT NULL,
            chat_id varchar(128) NOT NULL,
            detail_url varchar(2048) NOT NULL,
            parts json NOT NULL,
            next_part int NOT NULL DEFAULT 0,
            status varchar(20) NOT NULL,
            attempt_no int NOT NULL,
            next_retry_at datetime(6) NOT NULL,
            locked_until datetime(6) DEFAULT NULL,
            message_id varchar(32) DEFAULT NULL,
            created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            UNIQUE KEY job_id (job_id),
            KEY delivery_due (status, next_retry_at),
            CONSTRAINT job_notifications_job_fk FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS job_notifications")
    }
}
