import { Readable } from "node:stream"
import { spyOn } from "bun:test"
import { mail } from "../src/core/helpers/mail"
import { minio } from "../src/core/helpers/minio"
import { config } from "../src/config/config"

let restore: (() => void) | undefined

export function mockExternalServices() {
    restore?.()
    const email = spyOn(mail, "sendHtml").mockResolvedValue({ messageId: "test-email" } as Awaited<
        ReturnType<typeof mail.sendHtml>
    >)
    const objects = new Map<string, Buffer>()
    const privateBucket = spyOn(minio, "ensurePrivateBucket").mockResolvedValue(undefined)
    const upload = spyOn(minio, "upload").mockImplementation(async (name, data, _mime, bucket) => {
        objects.set(`${bucket}/${name}`, Buffer.from(data))
        return name
    })
    const getObject = spyOn(minio, "getObject").mockImplementation(async (name, bucket) => {
        const data = objects.get(`${bucket}/${name}`)
        if (!data) {
            throw Object.assign(new Error("Mock object not found"), { code: "NoSuchKey" })
        }
        return {
            stream: Readable.from([data]),
            stat: { size: data.length, etag: "test", lastModified: new Date(), metaData: {} }
        }
    })
    const remove = spyOn(minio, "delete").mockImplementation(async (name, bucket) => {
        objects.delete(`${bucket}/${name}`)
    })
    const signedUrl = spyOn(minio, "getPresignedUrl").mockImplementation(
        async (name) => `http://storage.test/${config.minio.bucket}/${name}?signature=test`
    )
    restore = () => {
        email.mockRestore()
        upload.mockRestore()
        signedUrl.mockRestore()
        privateBucket.mockRestore()
        getObject.mockRestore()
        remove.mockRestore()
    }
}

export function restoreExternalServices() {
    restore?.()
    restore = undefined
}
