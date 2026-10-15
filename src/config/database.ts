import { AllowMultiplePasswordResetTokens1792022401000 } from "../database/migrations/1792022401000-allow-multiple-password-reset-tokens"
import { CreateUsers1792022398000 } from "../database/migrations/1792022398000-create-users"
import { CreateContacts1792022399000 } from "../database/migrations/1792022399000-create-contacts"
import { SeparatePasswordResetTokens1792022400000 } from "../database/migrations/1792022400000-separate-password-reset-tokens"
import { PasswordResetToken } from "../modules/auth/entities/password-reset-token.entity"
import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "../modules/user/entities/user.entity"
import { Contact } from "../modules/contact/entities/contact.entity"
import { config } from "./config"

/**
 * TypeORM Database Configuration
 * 
 * Access via `AppDataSource` (default) atau `getDataSource()`.
 * Untuk testing, gunakan `setDataSource()` untuk override ke test database.
 */

export const databaseMigrations = [CreateUsers1792022398000, CreateContacts1792022399000, SeparatePasswordResetTokens1792022400000, AllowMultiplePasswordResetTokens1792022401000]

const defaultDataSource = new DataSource({
    type: config.database.type,
    host: config.database.host,
    port: config.database.port,
    username: config.database.user,
    password: config.database.pass,
    database: config.database.name,
    synchronize: config.database.sync,
    entities: [User, Contact, PasswordResetToken],
    migrations: databaseMigrations,
    migrationsTransactionMode: "each",
    subscribers: [],
})

let activeDataSource: DataSource = defaultDataSource

/** Get the active DataSource (default or test-overridden) */
export function getDataSource(): DataSource {
    return activeDataSource
}

/** Override DataSource for testing */
export function setDataSource(ds: DataSource): void {
    activeDataSource = ds
}

/** Reset to default DataSource */
export function resetDataSource(): void {
    activeDataSource = defaultDataSource
}

/**
 * Backward-compatible export.
 */
export const AppDataSource = new Proxy({} as DataSource, {
    get(_target, prop: string | symbol) {
        const value = (activeDataSource as any)[prop]
        if (typeof value === "function") {
            return value.bind(activeDataSource)
        }
        return value
    },
})
