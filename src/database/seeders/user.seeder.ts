import { AppDataSource } from "../../config/database"
import { logger } from "../../core/helpers/logger"
import { ValidationException } from "../../core/exceptions/base"
import { userService } from "../../modules/user/user.module"
import { UserService } from "../../modules/user/user.service"
import { CreateUserValidator } from "../../modules/user/validators/user.validator"

interface SeedUserInput {
    name: string
    email: string
    password: string
}

// Deterministic development fixtures; existing accounts are never overwritten.
export const DUMMY_USERS: readonly SeedUserInput[] = [
    { name: "Admin Demo", email: "admin@example.com", password: "password123" },
    { name: "Budi Santoso", email: "budi@example.com", password: "password123" },
    { name: "Siti Rahma", email: "siti@example.com", password: "password123" }
]

export class UserSeeder {
    constructor(private readonly userService: UserService) {}

    async runAll() {
        const results = []
        for (const input of DUMMY_USERS) {
            results.push(await this.run(input))
        }
        return results
    }

    async run(input: SeedUserInput): Promise<{ created: boolean; userId: number; email: string }> {
        const identity = CreateUserValidator.pick({ name: true, email: true }).safeParse(input)
        if (!identity.success) {
            throw new ValidationException(identity.error)
        }

        const existing = await this.userService.getByEmail(identity.data.email)
        if (existing) {
            return { created: false, userId: existing.id, email: existing.email }
        }

        const result = CreateUserValidator.safeParse({ ...input, isActive: true })
        if (!result.success) {
            throw new ValidationException(result.error)
        }

        // UserService hashes the password and applies the existing creation rules.
        const user = await this.userService.create(result.data)
        return { created: true, userId: user.id, email: user.email }
    }
}

export const userSeeder = new UserSeeder(userService)

export async function runUserSeeder() {
    try {
        await AppDataSource.initialize()
        const results = await userSeeder.runAll()
        for (const result of results) {
            logger.info(
                result.created ? "Seed user created" : "Seed user already exists; skipped",
                {
                    userId: result.userId,
                    email: result.email
                }
            )
        }
    } catch (err) {
        if (err instanceof ValidationException) {
            logger.error("Invalid dummy user data in user.seeder.ts", { errors: err.context })
        } else {
            logger.error("User seeding failed; ensure migrations have been applied", { err })
        }
        process.exitCode = 1
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy()
        }
    }
}

if (import.meta.main) {
    await runUserSeeder()
}
