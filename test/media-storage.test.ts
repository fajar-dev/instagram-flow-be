import { describe, expect, test } from "bun:test"
import { Readable } from "node:stream"
import {
    MinioMedia,
    type IPrivateObjectStorage
} from "../src/modules/content/media/adapters/minio-media.adapter"

const originalKey = `batches/${crypto.randomUUID()}/original/${crypto.randomUUID()}.jpeg`

describe("Private MinIO media adapter", () => {
    test("uses the existing helper with the shared private bucket and correct MIME", async () => {
        const calls: unknown[] = []
        const storage: IPrivateObjectStorage = {
            getPresignedUrl: async (key, expiry, bucket) =>
                `https://storage.test/${bucket}/${key}?expiry=${expiry}`,
            ensurePrivateBucket: async (bucket) => {
                calls.push(["private", bucket])
            },
            upload: async (key, data, mime, bucket) => {
                calls.push(["upload", key, data.toString(), mime, bucket])
                return key
            },
            getObject: async (_key, bucket) => {
                calls.push(["get", bucket])
                return { stream: Readable.from([Buffer.from("a"), Buffer.from("b")]) }
            },
            delete: async (_key, bucket) => {
                calls.push(["delete", bucket])
            }
        }
        const adapter = new MinioMedia(storage, "application-bucket")
        expect(await adapter.signedUrl(originalKey, 123)).toBe(
            `https://storage.test/application-bucket/${originalKey}?expiry=123`
        )
        await expect(adapter.signedUrl("../private", 123)).rejects.toThrow("Invalid media key")
        await adapter.put(originalKey, Buffer.from("photo"))
        const renderKey = `renders/${crypto.randomUUID()}.svg`
        await adapter.put(renderKey, Buffer.from("<svg/>"))
        expect(calls).toContainEqual([
            "upload",
            renderKey,
            "<svg/>",
            "image/svg+xml",
            "application-bucket"
        ])
        expect(await adapter.get(originalKey)).toEqual(Buffer.from("ab"))
        await adapter.remove(originalKey)
        expect(calls).toContainEqual([
            "upload",
            originalKey,
            "photo",
            "image/jpeg",
            "application-bucket"
        ])
        expect(calls).toContainEqual(["get", "application-bucket"])
        expect(calls).toContainEqual(["private", "application-bucket"])
        expect(calls).toContainEqual(["delete", "application-bucket"])
        await expect(adapter.get("../users/avatar.jpg")).rejects.toThrow("Invalid media key")
    })
    test("rejects writes if the bucket privacy check fails", async () => {
        let written = false
        const adapter = new MinioMedia(
            {
                getPresignedUrl: async (key, expiry, bucket) =>
                    `https://storage.test/${bucket}/${key}?expiry=${expiry}`,
                ensurePrivateBucket: async () => {
                    throw new Error("Unsafe bucket")
                },
                upload: async () => {
                    written = true
                    return originalKey
                },
                getObject: async () => ({ stream: Readable.from([]) }),
                delete: async () => {}
            },
            "application-bucket"
        )
        await expect(adapter.put(originalKey, Buffer.from("x"))).rejects.toThrow("Unsafe bucket")
        expect(written).toBe(false)
    })
})
