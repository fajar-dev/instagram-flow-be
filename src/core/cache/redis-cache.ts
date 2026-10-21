import { createHash, randomUUID } from "node:crypto"
import type { ICache } from "./cache.interface"

type Command = (...arguments_: string[]) => Promise<unknown>

const release = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`
const publish = `if redis.call('get', KEYS[1]) == ARGV[1] then redis.call('set', KEYS[2], ARGV[2], 'EX', ARGV[3]); return 1 end return 0`

/** Redis stores completed values; local promises only coalesce in-flight requests. */
export class RedisCache implements ICache {
    private readonly pending = new Map<string, Promise<unknown>>()

    constructor(
        private readonly command: Command,
        private readonly prefix: string,
        private readonly ttlSeconds = 300,
        private readonly waitMs = 10000
    ) {}

    async remember<T>(key: string, loader: () => Promise<T>): Promise<T> {
        const cacheKey = `${this.prefix}:${createHash("sha256").update(key).digest("hex")}`
        const pending = this.pending.get(cacheKey)
        if (pending) {
            return pending as Promise<T>
        }
        const promise = this.load(cacheKey, loader)
        this.pending.set(cacheKey, promise)
        try {
            return await promise
        } finally {
            this.pending.delete(cacheKey)
        }
    }

    private async load<T>(key: string, loader: () => Promise<T>): Promise<T> {
        const lockKey = `${key}:lock`
        const owner = randomUUID()
        const deadline = Date.now() + this.waitMs
        let acquired = false
        try {
            do {
                const cached = await this.command("GET", key)
                if (typeof cached === "string") {
                    return JSON.parse(cached) as T
                }
                acquired =
                    (await this.command("SET", lockKey, owner, "PX", "120000", "NX")) === "OK"
                if (acquired) {
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 100))
            } while (Date.now() < deadline)
        } catch {
            // Cache failure must not hide provider/domain errors or block analytics.
            return loader()
        }
        if (!acquired) {
            return loader()
        }
        try {
            // Another owner may have completed between our initial GET and lock acquisition.
            try {
                const cached = await this.command("GET", key)
                if (typeof cached === "string") {
                    return JSON.parse(cached) as T
                }
            } catch {
                // Continue with the provider when the cache becomes unavailable.
            }
            const result = await loader()
            try {
                // An expired owner cannot overwrite a newer result.
                await this.command(
                    "EVAL",
                    publish,
                    "2",
                    lockKey,
                    key,
                    owner,
                    JSON.stringify(result),
                    String(this.ttlSeconds)
                )
            } catch {
                // A successful provider response remains usable if Redis fails.
            }
            return result
        } finally {
            try {
                await this.command("EVAL", release, "1", lockKey, owner)
            } catch {
                // The lease expires even if the connection was lost.
            }
        }
    }
}
