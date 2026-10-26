import { expect, test } from "bun:test"
import sharp from "sharp"
import { readFileSync } from "node:fs"

const source = readFileSync(
    new URL("../integrations/n8n/nodes/apply-branding.js", import.meta.url),
    "utf8"
)
const execute = new (Object.getPrototypeOf(async function () {}).constructor)(
    "require",
    "$",
    "$input",
    "Buffer",
    source
)

async function render(output: string, count: number, missing = false) {
    const logo = await sharp({
        create: { width: 200, height: 60, channels: 3, background: "#294e6d" }
    })
        .png()
        .toBuffer()
    const photo = await sharp({
        create: { width: 800, height: 1000, channels: 3, background: "#568b9a" }
    })
        .jpeg()
        .toBuffer()
    const ctx: Record<string, unknown> = {
        "Validate Event": { output },
        "Get Manifest": {
            assets: Array.from({ length: count }),
            designReferences: { logoUrl: "amti", partnerLogoUrl: "gsi" }
        },
        "Parse Caption": { title: "INSTALASI SHMS & MONITORING" },
        "Materialize Images": {
            images: missing
                ? {}
                : {
                      amti: `data:image/png;base64,${logo.toString("base64")}`,
                      gsi: `data:image/png;base64,${logo.toString("base64")}`
                  }
        }
    }
    return execute(
        (name: string) => {
            if (name !== "sharp") {
                throw new Error("Unexpected module")
            }
            return sharp
        },
        (name: string) => ({ first: () => ({ json: ctx[name] }) }),
        {
            all: () =>
                Array.from({ length: count }, () => ({
                    json: { data: [{ b64_json: photo.toString("base64") }] }
                }))
        },
        Buffer
    )
}

test("Feed branding has identical header and footer pixels across cover and slides", async () => {
    const result = await render("feed", 2)
    const frames = result.map((item: any) => Buffer.from(item.json.data[0].b64_json, "base64"))
    expect((await sharp(frames[0]).metadata()).width).toBe(1080)
    expect((await sharp(frames[0]).metadata()).height).toBe(1350)
    for (const area of [
        { left: 0, top: 0, width: 1080, height: 144 },
        { left: 0, top: 1248, width: 1080, height: 96 }
    ]) {
        const pixels = await Promise.all(
            frames.map((frame: Buffer) => sharp(frame).extract(area).raw().toBuffer())
        )
        const difference =
            pixels[0].reduce(
                (sum: number, value: number, i: number) => sum + Math.abs(value - pixels[1][i]),
                0
            ) / pixels[0].length
        expect(difference).toBeLessThan(1)
    }
    expect(frames[0].equals(frames[1])).toBe(false)
})

test("Story uses final 9:16 dimensions and requires the original logos", async () => {
    const result = await render("story", 1)
    const metadata = await sharp(Buffer.from(result[0].json.data[0].b64_json, "base64")).metadata()
    expect([metadata.width, metadata.height]).toEqual([1080, 1920])
    await expect(render("feed", 1, true)).rejects.toThrow("Missing original branding asset")
})
