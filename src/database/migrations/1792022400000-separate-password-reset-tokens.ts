import { MigrationInterface, QueryRunner } from "typeorm"

export class SeparatePasswordResetTokens1792022400000 implements MigrationInterface {
    // MySQL DDL commits implicitly; each step is safe to retry.
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
            UNIQUE KEY UQ_password_reset_user (user_id),
            UNIQUE KEY UQ_password_reset_hash (token_hash),
            CONSTRAINT FK_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`)

        const hasToken = await queryRunner.hasColumn("users", "reset_password_token")
        const hasExpiry = await queryRunner.hasColumn("users", "reset_password_expires")
        if (hasToken && hasExpiry) {
            await queryRunner.query(`INSERT INTO password_reset_tokens (user_id, email, token_hash, expires_at)
                SELECT id, email, SHA2(reset_password_token, 256), reset_password_expires FROM users
                WHERE reset_password_token IS NOT NULL AND reset_password_expires > NOW()
                ON DUPLICATE KEY UPDATE user_id = password_reset_tokens.user_id`)
        }
        if (hasToken) await queryRunner.dropColumn("users", "reset_password_token")
        if (hasExpiry) await queryRunner.dropColumn("users", "reset_password_expires")
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        if (!await queryRunner.hasColumn("users", "reset_password_token")) {
            await queryRunner.query("ALTER TABLE users ADD reset_password_token varchar(255) NULL")
        }
        if (!await queryRunner.hasColumn("users", "reset_password_expires")) {
            await queryRunner.query("ALTER TABLE users ADD reset_password_expires timestamp NULL")
        }
        // Token hashes cannot be converted back into the original reset links.
        await queryRunner.query("DROP TABLE IF EXISTS password_reset_tokens")
    }
}
