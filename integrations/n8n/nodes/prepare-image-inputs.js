const manifest = $("Get Manifest").first().json
const references = manifest.designReferences
if (!references?.logoUrl || !references?.partnerLogoUrl) {
    throw new Error("Both supplied logos are required")
}
const urls = [references.logoUrl, references.partnerLogoUrl]
const output = $("Validate Event").first().json.output
const candidates = $("Parse Analysis").first().json.selectedAssetIds
const assets =
    output === "feed"
        ? manifest.assets
        : manifest.assets.filter((asset) => candidates.includes(asset.assetId))
urls.push(...assets.map((asset) => asset.renderImageUrl))
return [...new Set(urls)].map((url) => {
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
        throw new Error("Invalid design image URL")
    }
    return { json: { url } }
})
