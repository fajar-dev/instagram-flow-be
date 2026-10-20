const raw = $json.choices?.[0]?.message?.content
if (typeof raw !== "string") {
    throw new Error("Missing analysis")
}
const result = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""))
const assets = $("Get Manifest").first().json.assets
const ids = new Set(assets.map((asset) => asset.assetId))
const aliases = new Map(assets.map((asset, index) => [`image-${index + 1}`, asset.assetId]))
// Exact aliases only: never guess/fuzzy-match an ID to a different photograph.
const resolveId = (value) => aliases.get(value) ?? value
if (Array.isArray(result.rankings)) {
    result.rankings = result.rankings.map((row) => ({ ...row, assetId: resolveId(row?.assetId) }))
}
if (Array.isArray(result.selectedAssetIds)) {
    result.selectedAssetIds = result.selectedAssetIds.map(resolveId)
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
    ) ||
    !Array.isArray(result.selectedAssetIds) ||
    !result.selectedAssetIds.length ||
    result.selectedAssetIds.length > 5 ||
    new Set(result.selectedAssetIds).size !== result.selectedAssetIds.length ||
    result.selectedAssetIds.some((id) => !ids.has(id))
) {
    throw new Error("Incomplete or invalid analysis")
}
return [
    {
        json: {
            rankings: result.rankings.map(({ assetId, score, reason }) => ({
                assetId,
                score,
                reason
            })),
            selectedAssetIds: result.selectedAssetIds
        }
    }
]
