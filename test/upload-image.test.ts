import { expect, test } from "bun:test"
import sharp from "sharp"
import { StorageService } from "../src/modules/storage/storage.service"
import { readUploadImage } from "../src/core/helpers/upload-image"

test("image storage validates bytes, format and size before writing a sanitized JPEG", async () => {
    const writes: { data: Buffer; mime: string }[] = []
    const service = new StorageService({
        upload: async (key, data, mime) => {
            writes.push({ data, mime })
            return key
        }
    })
    await expect(
        service.upload(new File(["<svg/>"], "avatar.svg", { type: "image/svg+xml" }))
    ).rejects.toThrow()
    await expect(service.upload(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow(
        "Invalid file size"
    )
    expect(writes).toHaveLength(0)
    const png = await sharp({ create: { width: 24, height: 16, channels: 3, background: "red" } })
        .png()
        .toBuffer()
    await expect(
        readUploadImage(new File([png], "fake.jpg", { type: "image/jpeg" }), 1)
    ).rejects.toThrow("Only static")
    await expect(
        readUploadImage(new File([new Uint8Array(1048577)], "big.png", { type: "image/png" }), 1)
    ).rejects.toThrow("Invalid file size")
    const result = await service.upload(new File([png], "avatar.png", { type: "image/png" }))
    expect(result.path).toMatch(/^users\/[\w-]+\.jpg$/)
    expect(writes).toHaveLength(1)
    expect(writes[0].mime).toBe("image/jpeg")
    expect((await sharp(writes[0].data).metadata()).format).toBe("jpeg")
})
