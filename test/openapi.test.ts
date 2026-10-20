import { expect, test } from "bun:test"
import { createApp } from "../src/app"

const document = Bun.YAML.parse(
    await Bun.file(new URL("../swagger.yaml", import.meta.url)).text()
) as {
    openapi: string
    paths: Record<string, Record<string, unknown>>
    [key: string]: unknown
}
const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head"])

test("OpenAPI paths match every application endpoint", () => {
    const implemented = new Set(
        createApp()
            .routes.filter(
                (route) =>
                    route.method !== "ALL" &&
                    !["/api/docs", "/api/swagger.yaml"].includes(route.path)
            )
            .map(
                (route) =>
                    `${route.method.toLowerCase()} ${route.path.replace(/^\/api/, "").replace(/:(\w+)/g, "{$1}")}`
            )
    )
    const documented = new Set(
        Object.entries(document.paths).flatMap(([path, operations]) =>
            Object.keys(operations)
                .filter((method) => methods.has(method))
                .map((method) => `${method} ${path}`)
        )
    )
    expect([...implemented].sort()).toEqual([...documented].sort())
})

test("OpenAPI references resolve and every operation declares responses", () => {
    function visit(value: unknown) {
        if (!value || typeof value !== "object") {
            return
        }
        if ("$ref" in value) {
            const ref = String(value.$ref)
            expect(ref.startsWith("#/")).toBe(true)
            let target: unknown = document
            for (const part of ref.slice(2).split("/")) {
                target = (target as Record<string, unknown>)?.[
                    part.replace(/~1/g, "/").replace(/~0/g, "~")
                ]
            }
            expect(target).toBeDefined()
        }
        Object.values(value).forEach(visit)
    }

    visit(document)
    for (const operations of Object.values(document.paths)) {
        for (const [method, operation] of Object.entries(operations)) {
            if (methods.has(method)) {
                expect((operation as { responses: object }).responses).toBeDefined()
            }
        }
    }
})
