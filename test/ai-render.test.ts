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

test("AI renders fill feed and story canvases without white padding or baked-in outer margins", async () => {
    for (const output of ["feed", "story"] as const) {
        for (const bordered of [false, true]) {
            const source = sharp({
                create: { width: 900, height: 600, channels: 3, background: "#123456" }
            })
            const bytes = await (
                bordered
                    ? source.extend({
                          top: 20,
                          bottom: 20,
                          left: 28,
                          right: 28,
                          background: "white"
                      })
                    : source
            )
                .png()
                .toBuffer()
            const { service, input, objects } = fixture()
            input[0]!.placement = output
            input[0]!.height = output === "story" ? 1920 : 1350
            input[0]!.imageBase64 = bytes.toString("base64")
            const result = await service.create(input, assets, output, assetId, "result", [])
            const { data, info } = await sharp(objects.get(result[0]!.storageKey)!)
                .raw()
                .toBuffer({ resolveWithObject: true })
            expect(info.width).toBe(1080)
            expect(info.height).toBe(input[0]!.height)
            for (const [x, y] of [
                [0, 0],
                [1079, 0],
                [0, info.height - 1],
                [1079, info.height - 1]
            ]) {
                const offset = (y! * info.width + x!) * info.channels
                expect(data[offset]).toBeLessThan(40)
                expect(data[offset + 1]).toBeLessThan(80)
                expect(data[offset + 2]).toBeLessThan(110)
            }
        }
    }
})

test("final branded canvas keeps its edge geometry without trimming", async () => {
    const center = await sharp({
        create: { width: 1020, height: 1290, channels: 3, background: "#123456" }
    })
        .png()
        .toBuffer()
    const bytes = await sharp(center)
        .extend({ top: 30, bottom: 30, left: 30, right: 30, background: "white" })
        .png()
        .toBuffer()
    const { service, input, objects } = fixture()
    input[0]!.imageBase64 = bytes.toString("base64")
    const result = await service.create(input, assets, "feed", assetId, "result", [])
    const { data, info } = await sharp(objects.get(result[0]!.storageKey)!)
        .raw()
        .toBuffer({ resolveWithObject: true })
    expect(data[0]).toBeGreaterThan(240)
    expect(data[(100 * info.width + 100) * info.channels]).toBeLessThan(40)
})
