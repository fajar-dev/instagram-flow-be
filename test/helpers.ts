/**
 * Test Data Factories & Shared Utilities
 */

// ── User Test Data ──────────────────────────────────────────────────────────

let userCounter = 0

export function createUserData(overrides: Record<string, any> = {}) {
    userCounter++
    return {
        name: `Test User ${userCounter}`,
        email: `testuser${userCounter}@example.com`,
        password: "password123",
        ...overrides,
    }
}


// ── Response Assertions ─────────────────────────────────────────────────────

export function expectSuccess(body: any, statusCode: number = 200) {
    if (body.success !== true) {
        throw new Error(`Expected success=true, got: ${JSON.stringify(body)}`)
    }
    if (body.statusCode !== statusCode) {
        throw new Error(`Expected statusCode=${statusCode}, got: ${body.statusCode}`)
    }
}

export function expectError(body: any, statusCode: number) {
    if (body.success !== false) {
        throw new Error(`Expected success=false, got: ${JSON.stringify(body)}`)
    }
    if (body.statusCode !== statusCode) {
        throw new Error(`Expected statusCode=${statusCode}, got: ${body.statusCode}`)
    }
}

export function expectPagination(body: any) {
    if (!body.meta) {
        throw new Error(`Expected meta pagination, got: ${JSON.stringify(body)}`)
    }
    const requiredFields = ["total", "perPage", "currentPage", "lastPage", "from", "to"]
    for (const field of requiredFields) {
        if (body.meta[field] === undefined) {
            throw new Error(`Missing pagination field: ${field}`)
        }
    }
}

// ── Reset Counters ──────────────────────────────────────────────────────────

export function resetCounters() {
    userCounter = 0
}

/** Stores a deterministic reset token for API tests without sending email. */
export async function createPasswordResetToken(userId: number, email: string, expiresAt = new Date(Date.now() + 36000000)) {
    const { AppDataSource } = await import("../src/config/database")
    const { PasswordResetToken } = await import("../src/modules/auth/entities/password-reset-token.entity")
    const crypto = await import("node:crypto")
    const token = crypto.randomBytes(32).toString("hex")
    await AppDataSource.getRepository(PasswordResetToken).save({
        userId, email, expiresAt,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    })
    return token
}

export function createBatchData() {
    return { projectName: 'Bridge monitoring', activity: 'Sensor installation', location: 'Jakarta', documentationDate: '2026-01-01', publicationPermission: true as const }
}
