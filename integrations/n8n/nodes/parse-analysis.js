const responses = $input.all()
const result = { rankings: [] }
for (const response of responses) {
    const choice = response.json.choices?.[0]
    const raw = choice?.message?.content
    if (
        typeof raw !== "string" ||
        !raw.trim() ||
        (choice.finish_reason && choice.finish_reason !== "stop")
    ) {
        throw new Error("AI gateway returned an empty or incomplete photo analysis")
    }
    let part
    try {
        part = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""))
    } catch {
        throw new Error("AI gateway returned invalid analysis JSON")
    }
    if (!Array.isArray(part?.rankings) || !part.rankings.length) {
        throw new Error("Incomplete or invalid analysis")
    }
    result.rankings.push(...part.rankings)
}
const assets = $("Get Manifest").first().json.assets
const ids = new Set(assets.map((asset) => asset.assetId))
const aliases = new Map(assets.map((asset, index) => [`image-${index + 1}`, asset.assetId]))
// Exact aliases only: never guess/fuzzy-match an ID to a different photograph.
const resolveId = (value) => aliases.get(value) ?? value
if (Array.isArray(result.rankings)) {
    result.rankings = result.rankings.map((row) => ({ ...row, assetId: resolveId(row?.assetId) }))
}

if (
    !Array.isArray(result.rankings) ||
    result.rankings.length !== ids.size ||
    new Set(result.rankings.map((row) => row.assetId)).size !== ids.size ||
    result.rankings.some(
        (row) =>
            !ids.has(row.assetId) ||
            !Number.isFinite(row.score) ||
            row.score < 0 ||
            row.score > 100 ||
            typeof row.reason !== "string" ||
            !row.reason.trim() ||
            row.reason.length > 2000
    )
) {
    throw new Error("Incomplete or invalid analysis")
}
// Derive cover candidates from validated scores; model selection lists are not authoritative.
const selectedAssetIds = [...result.rankings]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((row) => row.assetId)
return [
    {
        json: {
            rankings: result.rankings.map(({ assetId, score, reason }) => ({
                assetId,
                score,
                reason
            })),
            selectedAssetIds
        }
    }
]
