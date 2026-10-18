import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateSettings1792195300013 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`settings\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`key\` varchar(100) NOT NULL,
\`non_secret_value\` json NOT NULL,
\`updated_by\` int NOT NULL,
FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`key\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS settings")
    }
}
