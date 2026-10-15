import { runUserSeeder } from "./user.seeder"

if (import.meta.main) {
    await runUserSeeder()
}
