import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateContacts1792195300001 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS contacts (
            id int NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            salutation enum('mr', 'mrs') NULL DEFAULT NULL,
            email varchar(255) NULL,
            phone varchar(255) NULL,
            type enum('customer', 'vendor', 'supplier', 'other') NOT NULL DEFAULT 'customer',
            is_active tinyint NOT NULL DEFAULT 1,
            created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id)
        ) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS contacts")
    }
}
