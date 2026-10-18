import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateDraftRevisions1792195300010 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`draft_revisions\` (
\`id\` varchar(36) NOT NULL PRIMARY KEY,
\`draft_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`draft_id\`) REFERENCES \`drafts\` (\`id\`) ON DELETE RESTRICT,
\`revision_no\` int NOT NULL,
\`primary_asset_id\` varchar(36) NOT NULL,
FOREIGN KEY (\`primary_asset_id\`) REFERENCES \`assets\` (\`id\`) ON DELETE RESTRICT,
\`title\` varchar(300) NOT NULL,
\`caption\` text NOT NULL,
\`hashtags\` json NOT NULL,
\`location\` varchar(200) NOT NULL,
\`activity\` varchar(200) NOT NULL,
\`content_hash\` varchar(64) NOT NULL,
\`created_by\` int NULL,
FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
UNIQUE (\`draft_id\`, \`revision_no\`),
INDEX (\`created_at\`)
) ENGINE=InnoDB`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS draft_revisions")
    }
}
