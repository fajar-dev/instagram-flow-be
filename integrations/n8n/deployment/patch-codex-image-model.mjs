/** Run inside the tested 9router container; restart it afterward. No credentials needed. */
import { readFileSync, writeFileSync } from "node:fs"

const patches = [
    ["/app/open-sse/handlers/imageProviders/codex.js", 'const CODEX_IMAGES_MAIN_MODEL = "gpt-5.5";', 'const CODEX_IMAGES_MAIN_MODEL = "gpt-6.1-sol";'],
    ["/app/.next/server/app/api/v1/images/generations/route.js", 'responsesModel:"gpt-5.5",toolModel:', 'responsesModel:"gpt-6.1-sol",toolModel:']
]

// Validate both files first: fail on a different gateway build instead of guessing.
const changes = patches.map(([path, before, after]) => {
    const source = readFileSync(path, "utf8")
    if (!source.includes(before) && !source.includes(after)) {
        throw new Error(`Unsupported gateway build: ${path}`)
    }
    return { path, source, updated: source.replaceAll(before, after) }
})
for (const { path, source, updated } of changes) {
    if (source !== updated) {
        writeFileSync(`${path}.before-ig-flow`, source, { flag: "wx", mode: 0o600 })
        writeFileSync(path, updated)
    }
}
console.log("Codex image orchestration model configured; restart the gateway.")
