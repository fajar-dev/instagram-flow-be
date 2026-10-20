import { databaseMigrations } from "../database/migrations"

import { workflowEntities } from "../modules/shared/entities"
import { PasswordResetToken } from "../modules/auth/entities/password-reset-token.entity"
import "reflect-metadata"
import { DataSource, type DataSourceOptions } from "typeorm"
import { User } from "../modules/user/entities/user.entity"
import { config } from "./config"

/**
 * TypeORM Database Configuration
 *
 * Access via `AppDataSource` (default) atau `getDataSource()`.
 * Untuk testing, gunakan `setDataSource()` untuk override ke test database.
 */

export const databaseOptions = {
    type: config.database.type,
    host: config.database.host,
    port: config.database.port,
    username: config.database.user,
    password: config.database.pass,
    database: config.database.name,
    synchronize: config.database.sync,
    timezone: "Z",
    entities: [User, PasswordResetToken, ...workflowEntities],
    migrations: databaseMigrations,
    migrationsTransactionMode: "each",
    subscribers: []
} satisfies DataSourceOptions

const defaultDataSource = new DataSource(databaseOptions)

let activeDataSource: DataSource = defaultDataSource

/** Get the active DataSource (default or test-overridden) */
export function getDataSource(): DataSource {
    return activeDataSource
}

/** Override DataSource for testing */
export function setDataSource(ds: DataSource): void {
    activeDataSource = ds
}

/** Resolve the active connection for repositories and integration tests. */
export const AppDataSource = new Proxy({} as DataSource, {
    get(_target, prop: string | symbol) {
        const value = (activeDataSource as any)[prop]
        if (typeof value === "function") {
            return value.bind(activeDataSource)
        }
        return value
    }
})
