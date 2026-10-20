const event = $("Validate Event").first().json
const manifest = $("Get Manifest").first().json
const analysis = $("Parse Analysis").first().json
const content = $json
const primary = manifest.assets.find((asset) => asset.assetId === analysis.selectedAssetIds[0])
if (!primary) {
    throw new Error("Missing primary asset")
}
const escape = (value) =>
    String(value).replace(
        /[<>&"']/g,
        (character) =>
            ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]
    )
const words = content.title.split(/\s+/)
const lines = [""]
for (const word of words) {
    const last = lines.length - 1
    if (lines[last].length + word.length + 1 > 32 && lines[last]) {
        lines.push(word)
    } else {
        lines[last] += (lines[last] ? " " : "") + word
    }
}
const placement = event.output
const height = placement === "story" ? 1920 : 1350
const photoHeight = height - 400
const title = lines
    .slice(0, 4)
    .map((line, i) => `<tspan x="64" y="${photoHeight + 150 + i * 52}">${escape(line)}</tspan>`)
    .join("")
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#0b2038"/><image href="${escape(primary.renderImageUrl)}" x="0" y="0" width="1080" height="${photoHeight}" preserveAspectRatio="xMidYMid slice"/><rect x="64" y="${photoHeight + 48}" width="64" height="8" fill="#24b3c7"/><text x="148" y="${photoHeight + 66}" fill="#ffffff" font-family="sans-serif" font-size="32" font-weight="700">AMTI</text><text fill="#ffffff" font-family="sans-serif" font-size="44" font-weight="700">${title}</text><text x="64" y="${height - 38}" fill="#9eb8ce" font-family="sans-serif" font-size="22">DOKUMENTASI KEGIATAN</text></svg>`
const render = { placement, format: "svg", width: 1080, height, svg, assetId: primary.assetId }
return [
    {
        json: {
            jobId: event.jobId,
            executionId: String($execution.id),
            resultVersion: 1,
            status: "READY_FOR_REVIEW",
            ...analysis,
            ...content,
            renders: [render]
        }
    }
]
