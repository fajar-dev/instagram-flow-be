import type { MigrationInterface, QueryRunner } from "typeorm"

export class CreateReviews1792490400009 implements MigrationInterface {
    transaction = false

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`reviews\` (
  \`id\` varchar(36) NOT NULL,
  \`draft_id\` varchar(36) NOT NULL,
  \`reviewer_id\` int NOT NULL,
  \`decision\` varchar(40) NOT NULL,
  \`notes\` text NOT NULL,
  \`content_hash\` varchar(64) NOT NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (\`id\`),
  KEY \`draft_id\` (\`draft_id\`),
  KEY \`reviewer_id\` (\`reviewer_id\`),
  KEY \`created_at\` (\`created_at\`),
  CONSTRAINT \`reviews_ibfk_1\` FOREIGN KEY (\`draft_id\`) REFERENCES \`drafts\` (\`id\`) ON DELETE RESTRICT,
  CONSTRAINT \`reviews_ibfk_3\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP TABLE IF EXISTS reviews")
    }
}
