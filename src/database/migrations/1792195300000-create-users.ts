import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateUsers1792195300000 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS users (
            id int NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            photo varchar(255) NULL,
            email varchar(255) NOT NULL,
            password varchar(255) NULL,
            is_active tinyint NOT NULL DEFAULT 1,
            created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            UNIQUE KEY UQ_users_email (email)
        ) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS users")
    }
}
