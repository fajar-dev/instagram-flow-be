import { spyOn } from "bun:test"
import { mail } from "../src/core/helpers/mail"
import { minio } from "../src/core/helpers/minio"
import { config } from "../src/config/config"

let restore: (() => void) | undefined

export function mockExternalServices() {
    restore?.()
    const email = spyOn(mail, "sendHtml").mockResolvedValue({ messageId: "test-email" } as Awaited<ReturnType<typeof mail.sendHtml>>)
    const upload = spyOn(minio, "upload").mockImplementation(async name => name)
    const signedUrl = spyOn(minio, "getPresignedUrl").mockImplementation(async name =>
        `http://storage.test/${config.minio.bucket}/${name}?signature=test`)
    restore = () => { email.mockRestore(); upload.mockRestore(); signedUrl.mockRestore() }
}

export function restoreExternalServices() {
    restore?.()
    restore = undefined
}
