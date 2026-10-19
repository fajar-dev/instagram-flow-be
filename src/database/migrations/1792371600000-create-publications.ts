import type { MigrationInterface, QueryRunner } from 'typeorm'
export class CreatePublications1792371600000 implements MigrationInterface {
    transaction = false
    async up(runner: QueryRunner) {
        await runner.query(`CREATE TABLE publications (
            id varchar(36) NOT NULL PRIMARY KEY,
            draft_id varchar(36) NOT NULL, revision_id varchar(36) NOT NULL,
            account_key varchar(64) NOT NULL, request_key varchar(128) NOT NULL, request_hash varchar(64) NOT NULL,
            snapshot json NOT NULL, media_key varchar(255) NOT NULL, status varchar(20) NOT NULL,
            scheduled_at datetime(6) NOT NULL, next_attempt_at datetime(6) NOT NULL,
            locked_until datetime(6) NULL, lock_token varchar(36) NULL,
            container_id varchar(128) NULL, container_created_at datetime(6) NULL,
            media_id varchar(128) NULL, permalink varchar(500) NULL, safe_error varchar(500) NULL,
            attempt_count int NOT NULL DEFAULT 0, published_at datetime(6) NULL, created_by int NOT NULL,
            created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            UNIQUE KEY publication_request (draft_id, request_key, account_key),
            INDEX publication_due (status, next_attempt_at, locked_until),
            INDEX publication_draft (draft_id, created_at)
        ) ENGINE=InnoDB`)
    }
    async down(runner: QueryRunner) { await runner.query('DROP TABLE IF EXISTS publications') }
}
