import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { buildWorkflow } from "../integrations/n8n/build-workflow"
import { sanitizeSvg } from "../src/modules/content/media/adapters/svg-sanitizer"

const jobId = "11111111-1111-4111-8111-111111111111"
const assetId = "22222222-2222-4222-8222-222222222222"
const event = { jobId, eventId: jobId, output: "feed" }
const manifest = {
    jobId,
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
const context = {
    "Validate Event": event,
    "Get Manifest": manifest,
    "Parse Analysis": analysis,
    Configuration: { model: "test" }
}

function run(file: string, input: unknown) {
    const source = readFileSync(
        new URL(`../integrations/n8n/nodes/${file}.js`, import.meta.url),
        "utf8"
    )
    return new Function("$json", "$", "$execution", source)(
        input,
        (name: keyof typeof context) => ({ first: () => ({ json: context[name] }) }),
        { id: "42" }
    )[0].json
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
        expect(() =>
            run("parse-analysis", response({ ...analysis, selectedAssetIds: [jobId] }))
        ).toThrow()
    })
    test("caption validation and XML-safe render match backend sanitizer", () => {
        const content = run(
            "parse-caption",
            response({
                title: "AMTI & <QA>",
                caption: "Synthetic test",
                hashtags: ["AMTI", "#AMTI"]
            })
        )
        expect(content.hashtags).toEqual(["#AMTI"])
        const result = run("render-result", content)
        expect(result.renders.map((r: any) => r.height)).toEqual([1350])
        for (const render of result.renders) {
            expect(render.svg).toContain("AMTI &amp; &lt;QA&gt;")
            expect(
                sanitizeSvg(
                    render.svg,
                    Buffer.from("test"),
                    (url) => url === manifest.assets[0]!.renderImageUrl
                )
            ).toContain("data:image/jpeg;base64,")
        }
        expect(() =>
            run("parse-caption", response({ title: "", caption: "test", hashtags: [] }))
        ).toThrow()
    })
    test("Story generates one portrait render and no Feed caption", () => {
        const previous = event.output
        event.output = "story"
        try {
            const content = run(
                "parse-caption",
                response({ title: "AMTI Story", caption: "", hashtags: [] })
            )
            const result = run("render-result", content)
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
