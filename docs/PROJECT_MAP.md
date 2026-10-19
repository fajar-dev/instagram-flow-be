# Peta source backend IG Flow

## Application entry points

- `src/index.ts`: server and middleware setup.
- `src/routes/api.ts`: central API registration.
- `src/config/config.ts`: validated runtime configuration.
- `src/config/database.ts`: MySQL entities and migration registration.
- `src/database/migrations/index.ts`: ordered migration history; synchronization remains disabled.
- `src/database/seeders/`: explicit CLI seeders.

## Feature modules

Each module wires dependencies in its `*.module.ts` file. Controllers delegate to services; services receive repository interfaces.

- `auth`: authentication, profile, Google login and password resets.
- `user`: user management and profile-photo serialization.
- `storage`: authenticated object-storage operations.
- `content`: batches and private MinIO media, including thumbnails.
- `ai-job`: processing lifecycle, dispatch command and n8n workflow contracts.
- `content-review`: revisions, edits and review decisions.
- `integration`: dashboard dispatcher controls.
- `reporting`: list queries, counts, overview and audit data.
- `shared`: transactional persistence and context shared across automation modules.

## Supporting files

- `src/core/`: shared middleware, validation, errors, logging, response and storage helpers.
- `src/commands/job-dispatch.ts`: dispatcher CLI.
- `integrations/n8n/`: workflow builder, nodes, generated JSON and deployment instructions.
- `test/`: isolated MySQL tests with mocked external storage and mail.
- `swagger.yaml`: public API documentation.

## Instagram

- `src/modules/instagram/`: credential JSON privat dan adapter Graph API.
- `src/modules/publishing/`: snapshot dan antrean satu publikasi per project ke satu akun.
- `src/commands/publication-dispatch.ts`: worker `posts:dispatch`.
- `secrets/instagram-accounts.example.json`: contoh tanpa credential asli.
