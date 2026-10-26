import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { buildWorkflow } from "../integrations/n8n/build-workflow"

const jobId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const event = { jobId, eventId: jobId, output: "feed" }
const manifest = {
    jobId,
    designReferences: {
        styleUrl: "https://storage.test/style.png",
        logoUrl: "https://storage.test/logo.png",
        partnerLogoUrl: "https://storage.test/partner.jpeg"
    },
    assets: [
        {
            assetId,
            aiImageUrl: "https://storage.test/image.jpg?a=1&b=2",
            renderImageUrl: "https://storage.test/image.jpg?a=1&b=2"
        }
    ]
}
const analysis = {
    rankings: [{ assetId, score: 90, reason: "Suitable" }],
    selectedAssetIds: [assetId]
}
const imageData = (url: string) => `data:image/png;base64,${Buffer.from(url).toString("base64")}`
const context = {
    get "Materialize Images"() {
        const urls = [
            ...Object.values(manifest.designReferences),
            ...manifest.assets.map((asset) => asset.renderImageUrl)
        ]
        return { images: Object.fromEntries(urls.map((url) => [url, imageData(url)])) }
    },
    "Validate Event": event,
    "Get Manifest": manifest,
    "Parse Analysis": analysis,
    "Parse Caption": { title: "AMTI", caption: "Test", hashtags: [] },
    Configuration: { model: "test", imageModel: "cx/gpt-image-2" }
}

function runAll(file: string, input: unknown, inputs = [input]) {
    const source = readFileSync(
        new URL(`../integrations/n8n/nodes/${file}.js`, import.meta.url),
        "utf8"
    )
    return new Function("$json", "$", "$execution", "$input", source)(
        input,
        (name: keyof typeof context) => ({ first: () => ({ json: context[name] }) }),
        { id: "42" },
        { all: () => inputs.map((json) => ({ json })) }
    )
}

function run(file: string, input: unknown) {
    return runAll(file, input)[0].json
}

const response = (value: unknown) => ({
    choices: [{ message: { content: JSON.stringify(value) } }]
})
describe("deployable n8n workflow", () => {
    test("validates events before acknowledging and rejects duplicate outputs", () => {
        expect(run("validate-event", { body: event }).valid).toBe(true)
        expect(run("validate-event", { body: { ...event, output: ["feed", "feed"] } }).valid).toBe(
            false
        )
        expect(run("validate-event", { body: {} }).valid).toBe(false)
    })
    test("all manifest assets are included and all analysis IDs are validated", () => {
        expect(run("prepare-analysis", manifest).messages[0].content).toHaveLength(3)
        expect(run("parse-analysis", response(analysis))).toEqual(analysis)
        expect(run("prepare-analysis", manifest).messages[0].content[1].text).toBe(
            "assetId: image-1"
        )
        expect(
            run(
                "parse-analysis",
                response({
                    rankings: [{ assetId: "image-1", score: 90, reason: "Suitable" }],
                    selectedAssetIds: ["image-1"]
                })
            )
        ).toEqual(analysis)
        expect(() =>
            run(
                "parse-analysis",
                response({
                    rankings: [{ assetId: "image-2", score: 90, reason: "Suitable" }],
                    selectedAssetIds: ["image-2"]
                })
            )
        ).toThrow()
        expect(() => run("parse-analysis", response({ ...analysis, rankings: [] }))).toThrow()
        for (const selectedAssetIds of [[], [jobId], undefined]) {
            expect(run("parse-analysis", response({ ...analysis, selectedAssetIds }))).toEqual(
                analysis
            )
        }
    })
    test("caption validation and AI image result match the callback contract", () => {
        const content = run(
            "parse-caption",
            response({
                title: "AMTI & <QA>",
                caption: "Synthetic test",
                hashtags: ["AMTI", "#AMTI"]
            })
        )
        expect(content.hashtags).toEqual(["#AMTI"])
        const result = run("render-result", { data: [{ b64_json: "aW1hZ2U=" }] })
        expect(result.renders.map((r: any) => r.height)).toEqual([1350])
        expect(result.renders[0].format).toBe("jpeg")
        expect(result.renders[0].imageBase64).toBe("aW1hZ2U=")
        expect(() => run("render-result", { data: [] })).toThrow()
        expect(() => run("render-result", { data: [{ url: "https://example.test" }] })).toThrow()
        const request = run("prepare-design", {})
        expect(request.images).toEqual([imageData(manifest.assets[0]!.renderImageUrl)])
        expect(request.model).toBe("cx/gpt-image-2")
        expect(() =>
            run("parse-caption", response({ title: "", caption: "test", hashtags: [] }))
        ).toThrow()
    })
    test("AI receives only source photos and branding stays in a separate node", () => {
        const request = run("prepare-design", {})
        expect(request.images).toEqual([imageData(manifest.assets[0]!.renderImageUrl)])
        const workflow = buildWorkflow()
        expect(workflow.connections["Edit Image"].main[0][0].node).toBe("Apply Branding")
        expect(workflow.connections["Apply Branding"].main[0][0].node).toBe("Render Result")
    })

    test("Story generates one portrait render and no Feed caption", () => {
        const previous = event.output
        event.output = "story"
        try {
            const content = run(
                "parse-caption",
                response({ title: "AMTI Story", caption: "", hashtags: [] })
            )
            expect(content.caption).toBe("")
            const result = run("render-result", { data: [{ b64_json: "aW1hZ2U=" }] })
            expect(result.renders).toHaveLength(1)
            expect(result.renders[0].placement).toBe("story")
            expect(result.renders[0].height).toBe(1920)
            expect(() =>
                run(
                    "parse-caption",
                    response({ title: "Story", caption: "Feed caption", hashtags: [] })
                )
            ).toThrow()
        } finally {
            event.output = previous
        }
    })

    test("webhook authenticates; every post-claim fallible node reports failure", () => {
        const workflow = buildWorkflow()
        expect(
            workflow.nodes.find((n) => n.name === "Receive Job")!.parameters.authentication
        ).toBe("headerAuth")
        for (const node of workflow.nodes.filter((n) => n.onError)) {
            expect(workflow.connections[node.name].main[1][0].node).toBe("Callback Failure")
        }
        expect(workflow.connections["Claim Accepted"].main).toHaveLength(1)
        expect(workflow.connections["Callback Failure"].main[0][0].node).toBe(
            "Mark Execution Failed"
        )
        const serialized = JSON.stringify(workflow)
        expect(serialized).not.toContain("/api/social")
        expect(serialized).not.toContain("Bearer ")
        expect(serialized).not.toContain("telegram")
    })
})

test("vision requests split large uploads without losing aliases or accepting partial analysis", () => {
    const assets = Array.from({ length: 13 }, (_, index) => ({
        assetId: `asset-${index + 1}`,
        aiImageUrl: "https://storage.test/image.jpg"
    }))
    const lookup = (name: string) => ({
        first: () => ({
            json:
                name === "Get Manifest"
                    ? { jobId, assets }
                    : name === "Validate Event"
                      ? event
                      : { model: "test" }
        })
    })
    const source = (file: string) =>
        readFileSync(new URL(`../integrations/n8n/nodes/${file}.js`, import.meta.url), "utf8")
    const requests = new Function("$json", "$", source("prepare-analysis"))(
        { jobId, assets },
        lookup
    )
    expect(
        buildWorkflow().nodes.find((node) => node.name === "Analyze Photos")!.parameters.options
            .batching.batch
    ).toEqual({ batchSize: 1, batchInterval: 3000 })
    expect(requests).toHaveLength(13)
    expect(
        requests.map(
            (item: any) =>
                item.json.messages[0].content.filter((part: any) => part.type === "image_url")
                    .length
        )
    ).toEqual(Array(13).fill(1))
    expect(requests[12].json.messages[0].content[1].text).toBe("assetId: image-13")
    const replies = requests.map((_item: unknown, chunk: number) => ({
        json: response({
            rankings: assets.slice(chunk, chunk + 1).map((_asset, index) => ({
                assetId: `image-${chunk + index + 1}`,
                score: 90 - chunk,
                reason: "Suitable"
            })),
            selectedAssetIds: [`image-${chunk + 1}`]
        })
    }))
    const parse = (items: unknown[]) =>
        new Function("$input", "$", source("parse-analysis"))({ all: () => items }, lookup)[0].json
    expect(parse(replies).rankings).toHaveLength(13)
    expect(parse(replies).selectedAssetIds).toEqual([
        "asset-1",
        "asset-2",
        "asset-3",
        "asset-4",
        "asset-5"
    ])
    expect(() => parse(replies.slice(0, 3))).toThrow("Incomplete or invalid analysis")
    expect(() =>
        parse([{ json: { choices: [{ finish_reason: "in_progress", message: { content: "" } }] } }])
    ).toThrow("empty or incomplete")
})

test("Feed edits all 19 source photographs and retains slide identity in the callback", () => {
    const originals = manifest.assets
    try {
        manifest.assets = Array.from({ length: 19 }, (_, index) => ({
            ...originals[0]!,
            assetId: index === 0 ? assetId : crypto.randomUUID()
        }))
        const requests = runAll("prepare-design", {})
        expect(requests).toHaveLength(19)
        expect(requests[1].json.images[0]).toBe(imageData(manifest.assets[1]!.renderImageUrl))
        const responses = requests.map(() => ({ data: [{ b64_json: "aW1hZ2U=" }] }))
        const result = runAll("render-result", responses[0], responses)[0].json
        expect(result.renders.map((r: any) => r.assetId)).toEqual(
            manifest.assets.map((a) => a.assetId)
        )
        expect(() => runAll("render-result", responses[0], responses.slice(1))).toThrow()
    } finally {
        manifest.assets = originals
    }
})

test("analysis ranks all candidates even when a model declines to select a photo", () => {
    const previous = manifest.assets
    try {
        const second = crypto.randomUUID()
        manifest.assets = [previous[0]!, { ...previous[0]!, assetId: second }]
        const inputs = [
            response({
                rankings: [{ assetId: "image-1", score: 25, reason: "Kurang tajam" }],
                selectedAssetIds: []
            }),
            response({ rankings: [{ assetId: "image-2", score: 90, reason: "Jelas" }] })
        ]
        const result = runAll("parse-analysis", inputs[0], inputs)[0].json
        expect(result.rankings).toHaveLength(2)
        expect(result.selectedAssetIds).toEqual([second, assetId])
        expect(() => runAll("parse-analysis", inputs[0], [inputs[0], inputs[0]])).toThrow()
    } finally {
        manifest.assets = previous
    }
})

test("image references are downloaded once without sending service credentials to storage", () => {
    const inputs = runAll("prepare-image-inputs", {})
    expect(inputs).toHaveLength(3)
    const workflow = buildWorkflow()
    const download = workflow.nodes.find((node) => node.name === "Download Design Images")!
    expect(download.credentials).toBeUndefined()
    expect(download.parameters.options.response.response.responseFormat).toBe("file")
    expect(download.onError).toBe("continueErrorOutput")
    expect(
        run("prepare-design", {}).images.every((url: string) => url.startsWith("data:image/"))
    ).toBe(true)
})

test("materialized image inputs preserve bytes and reject non-image responses", async () => {
    const source = readFileSync(
        new URL("../integrations/n8n/nodes/materialize-images.js", import.meta.url),
        "utf8"
    )
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const execute = new AsyncFunction("$", "$input", source)
    const sources = [{ json: { url: "https://storage.test/photo" } }]
    const invoke = (bytes: Buffer, downloads = [{}]) =>
        execute.call(
            { helpers: { getBinaryDataBuffer: async () => bytes } },
            () => ({ all: () => sources }),
            { all: () => downloads }
        )
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
    const result = await invoke(jpeg)
    expect(result[0].json.images[sources[0]!.json.url]).toBe(
        `data:image/jpeg;base64,${jpeg.toString("base64")}`
    )
    await expect(invoke(Buffer.from("<html>error</html>"))).rejects.toThrow("JPEG or PNG")
    await expect(invoke(jpeg, [])).rejects.toThrow("Incomplete")
    await expect(invoke(Buffer.alloc(12 * 1024 * 1024 + 1))).rejects.toThrow("size limit")
})
