import { expect, test } from "bun:test"
import { RedisCache } from "../src/core/cache/redis-cache"
import { cacheStore } from "./helpers/cache"

test("Redis cache shares results across instances and coalesces concurrent misses", async () => {
    const store = cacheStore()
    const first = new RedisCache(store.command, "test")
    const second = new RedisCache(store.command, "test")
    let calls = 0
    const loader = async () => {
        calls++
        await Bun.sleep(20)
        return { metrics: [0, null], fetchedAt: "original" }
    }
    const results = await Promise.all([
        first.remember("account", loader),
        second.remember("account", loader)
    ])
    expect(results[0]).toEqual(results[1])
    await second.remember("account", loader)
    expect(calls).toBe(1)
    await first.remember("other-account", loader)
    expect(calls).toBe(2)
})

test("expired cache reloads and provider failures release locks without caching errors", async () => {
    const store = cacheStore()
    const cache = new RedisCache(store.command, "test")
    await expect(
        cache.remember("key", async () => {
            throw new Error("provider")
        })
    ).rejects.toThrow("provider")
    expect(store.values.size).toBe(0)
    await cache.remember("key", async () => 1)
    for (const value of store.values.values()) {
        value.expires = 0
    }
    expect(await cache.remember("key", async () => 2)).toBe(2)
})

test("Redis outage falls back once and does not swallow provider errors", async () => {
    const cache = new RedisCache(async () => {
        throw new Error("offline")
    }, "test")
    let calls = 0
    const loader = async () => {
        calls++
        await Bun.sleep(10)
        return 3
    }
    expect(
        await Promise.all([cache.remember("key", loader), cache.remember("key", loader)])
    ).toEqual([3, 3])
    expect(calls).toBe(1)
    await expect(
        cache.remember("key", async () => {
            throw new Error("domain")
        })
    ).rejects.toThrow("domain")
})

test("expired lock owner cannot overwrite a newer cache result or remove its lock", async () => {
    const store = cacheStore()
    const cache = new RedisCache(store.command, "test")
    await cache.remember("key", async () => {
        const lockKey = [...store.values.keys()].find((key) => key.endsWith(":lock"))!
        store.values.set(lockKey, { value: "new-owner", expires: Date.now() + 10000 })
        store.values.set(lockKey.slice(0, -5), {
            value: JSON.stringify("new-result"),
            expires: Date.now() + 10000
        })
        return "old-result"
    })
    expect(await cache.remember("key", async () => "unexpected")).toBe("new-result")
    expect([...store.values.values()].some((entry) => entry.value === "new-owner")).toBe(true)
})

test("busy lock has a bounded wait and fallback does not overwrite its owner", async () => {
    const store = cacheStore()
    const cache = new RedisCache(
        async (...args) => {
            if (args[0] === "SET") {
                return null
            }
            return store.command(...args)
        },
        "test",
        300,
        1
    )
    expect(await cache.remember("busy", async () => 4)).toBe(4)
    expect(store.values.size).toBe(0)
})

test("cache write failure returns the successful provider response without rerunning it", async () => {
    const store = cacheStore()
    const cache = new RedisCache(async (...args) => {
        if (args[0] === "EVAL" && args[2] === "2") {
            throw new Error("write unavailable")
        }
        return store.command(...args)
    }, "test")
    let calls = 0
    expect(
        await cache.remember("key", async () => {
            calls++
            return 5
        })
    ).toBe(5)
    expect(calls).toBe(1)
    expect(store.values.size).toBe(0)
})
