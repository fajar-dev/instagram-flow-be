import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateReviews1792368000010 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`reviews\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`draft_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`draft_id\`) REFERENCES \`drafts\` (\`id\`) ON DELETE RESTRICT,
\`revision_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`revision_id\`) REFERENCES \`draft_revisions\` (\`id\`) ON DELETE RESTRICT,
\`reviewer_id\` int NOT NULL,
FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`decision\` varchar(40) NOT NULL,
\`notes\` text NOT NULL,
\`content_hash\` varchar(64) NOT NULL,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS reviews")
    }
}
