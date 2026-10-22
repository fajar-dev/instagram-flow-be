import { expect, test } from "bun:test"
import sharp from "sharp"
import { RenderService } from "../src/modules/content/media/render.service"
import type { Asset } from "../src/modules/content/media/entities/asset.entity"
import type { IContentMedia } from "../src/modules/content/media/interfaces/content-media.interface"
import type { ResultInput } from "../src/modules/ai-job/workflow/validators/workflow.validator"

const assetId = crypto.randomUUID()
const assets = [{ id: assetId, deletedAt: null }] as Asset[]
const pixels = await sharp({
    create: { width: 512, height: 640, channels: 3, background: "#123456" }
})
    .png()
    .toBuffer()

function fixture() {
    const objects = new Map<string, Buffer>()
    const media: IContentMedia = {
        async put(key, bytes) {
            objects.set(key, bytes)
        },
        async get() {
            throw new Error("Must never read photos or compose templates")
        },
        async signedUrl() {
            throw new Error("Must never fetch source URLs")
        },
        async remove(key) {
            objects.delete(key)
        }
    }
    const service = new RenderService(media)
    const input: ResultInput["renders"] = [
        {
            placement: "feed",
            format: "jpeg",
            width: 1080,
            height: 1350,
            assetId,
            imageBase64: pixels.toString("base64")
        }
    ]
    return { service, input, objects }
}

test("AI raster is normalized and stored without reading or composing source photos", async () => {
    const { service, input, objects } = fixture()
    const keys: string[] = []
    const result = await service.create(input, assets, "feed", assetId, crypto.randomUUID(), keys)
    expect(result[0]!.renderState).toBe("AI_IMAGE")
    expect(result[0]!.format).toBe("jpeg")
    expect(keys).toEqual([result[0]!.storageKey])
    const metadata = await sharp(objects.get(keys[0]!)!).metadata()
    expect(metadata.format).toBe("jpeg")
    expect(metadata.width).toBe(1080)
    expect(metadata.height).toBe(1350)
    await service.cleanup(keys)
    expect(objects.size).toBe(0)
})

test("AI raster rejects active markup, malformed base64, truncated files and tiny images", async () => {
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
        .png()
        .toBuffer()
    for (const image of [
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"/>'),
        pixels.subarray(0, 30),
        tiny
    ]) {
        const { service, input, objects } = fixture()
        input[0]!.imageBase64 = image.toString("base64")
        await expect(service.create(input, assets, "feed", assetId, "result", [])).rejects.toThrow()
        expect(objects.size).toBe(0)
    }
    const { service, input } = fixture()
    input[0]!.imageBase64 = pixels.toString("base64") + "!"
    await expect(service.create(input, assets, "feed", assetId, "result", [])).rejects.toThrow()
})

test("AI raster enforces output and source membership", async () => {
    const { service, input } = fixture()
    await expect(service.create(input, assets, "story", assetId, "result", [])).rejects.toThrow()
    expect(
        await service.create(input, assets, "feed", crypto.randomUUID(), "result", [])
    ).toHaveLength(1)
    await expect(service.create(input, [], "feed", assetId, "result", [])).rejects.toThrow()
    await expect(
        service.create(
            input,
            [{ ...assets[0]!, deletedAt: new Date() }],
            "feed",
            assetId,
            "result",
            []
        )
    ).rejects.toThrow()
})
