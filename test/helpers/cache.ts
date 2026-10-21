import { RedisCache } from "../../src/core/cache/redis-cache"

export function cacheStore() {
    const values = new Map<string, { value: string; expires: number }>()
    const command = async (...args: string[]): Promise<unknown> => {
        const [operation, key] = args
        if (operation === "GET") {
            const entry = values.get(key!)
            return entry && entry.expires > Date.now() ? entry.value : null
        }
        if (operation === "SET") {
            const existing = values.get(key!)
            if (args.includes("NX") && existing && existing.expires > Date.now()) {
                return null
            }
            values.set(key!, { value: args[2]!, expires: Date.now() + Number(args[4]) })
            return "OK"
        }
        if (operation === "EVAL") {
            const lock = args[3]!
            const publishing = args[2] === "2"
            const owner = args[publishing ? 5 : 4]
            if ((await command("GET", lock)) !== owner) {
                return 0
            }
            if (publishing) {
                values.set(args[4]!, {
                    value: args[6]!,
                    expires: Date.now() + Number(args[7]) * 1000
                })
            } else {
                values.delete(lock)
            }
            return 1
        }
        throw new Error("Unsupported test command")
    }
    return { command, values }
}

export function testCache() {
    return new RedisCache(cacheStore().command, "test")
}
