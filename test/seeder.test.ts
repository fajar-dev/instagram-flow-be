import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import type { Hono } from "hono"
import { AppDataSource } from "../src/config/database"
import { User } from "../src/modules/user/entities/user.entity"
import { ValidationException } from "../src/core/exceptions/base"
import {
    cleanTestDatabase,
    createTestApp,
    destroyTestDatabase,
    initTestDatabase,
    request
} from "./setup"

let app: Hono
let seeder: typeof import("../src/database/seeders/user.seeder").userSeeder
const input = { name: "Seed User", email: "seed@example.com", password: "seed-password-123" }

beforeAll(async () => {
    await initTestDatabase()
    app = createTestApp()
    seeder = (await import("../src/database/seeders/user.seeder")).userSeeder
})
beforeEach(cleanTestDatabase)
afterAll(destroyTestDatabase)

describe("User seeder", () => {
    test("seeds all dummy users without environment input and safely skips them on rerun", async () => {
        const first = await seeder.runAll()
        expect(first).toHaveLength(3)
        expect(first.every((result) => result.created)).toBe(true)
        const second = await seeder.runAll()
        expect(second.every((result) => !result.created)).toBe(true)
        expect(await AppDataSource.getRepository(User).count()).toBe(3)
        for (const result of first) {
            expect(
                (
                    await request(app, "/api/auth/login", {
                        method: "POST",
                        body: { email: result.email, password: "password123" }
                    })
                ).status
            ).toBe(200)
        }
    })

    test("creates an active user with a hashed password that can log in", async () => {
        const result = await seeder.run(input)
        expect(result.created).toBe(true)
        expect(Object.keys(result).sort()).toEqual(["created", "email", "userId"])
        const stored = await AppDataSource.getRepository(User)
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.id = :id", { id: result.userId })
            .getOneOrFail()
        expect(stored.password).not.toBe(input.password)
        expect(stored.isActive).toBe(true)
        const login = await request(app, "/api/auth/login", {
            method: "POST",
            body: { email: input.email, password: input.password }
        })
        expect(login.status).toBe(200)
        expect(login.body.data.user.id).toBe(result.userId)
    })

    test("repeated seed preserves existing password, name, and status", async () => {
        const first = await seeder.run(input)
        await AppDataSource.getRepository(User).update(first.userId, { isActive: false })
        const second = await seeder.run({ ...input, name: "Replacement", password: "" })
        expect(second.created).toBe(false)
        expect(second.userId).toBe(first.userId)
        expect(await AppDataSource.getRepository(User).count()).toBe(1)
        const stored = await AppDataSource.getRepository(User).findOneByOrFail({ id: first.userId })
        expect(stored.name).toBe(input.name)
        expect(stored.isActive).toBe(false)
        await AppDataSource.getRepository(User).update(first.userId, { isActive: true })
        expect(
            (
                await request(app, "/api/auth/login", {
                    method: "POST",
                    body: { email: input.email, password: input.password }
                })
            ).status
        ).toBe(200)
    })

    test("invalid email or password cannot create a user", async () => {
        for (const invalid of [
            { ...input, email: "invalid" },
            { ...input, password: "" },
            { ...input, password: "123" }
        ]) {
            await expect(seeder.run(invalid)).rejects.toBeInstanceOf(ValidationException)
        }
        expect(await AppDataSource.getRepository(User).count()).toBe(0)
    })
})
