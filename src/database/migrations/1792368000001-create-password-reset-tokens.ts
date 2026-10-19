import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreatePasswordResetTokens1792368000001 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id int NOT NULL AUTO_INCREMENT,
            user_id int NOT NULL,
            email varchar(255) NOT NULL,
            token_hash varchar(64) NOT NULL,
            expires_at datetime NOT NULL,
            created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            KEY IX_password_reset_user (user_id),
            UNIQUE KEY UQ_password_reset_hash (token_hash),
            CONSTRAINT FK_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS password_reset_tokens")
    }
}
