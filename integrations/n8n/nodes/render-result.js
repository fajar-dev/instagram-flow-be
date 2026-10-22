const event = $("Validate Event").first().json
const analysis = $("Parse Analysis").first().json
const content = $("Parse Caption").first().json
const coverId = analysis.selectedAssetIds[0]
const manifest = $("Get Manifest").first().json
const assetIds =
    event.output === "feed"
        ? [
              coverId,
              ...manifest.assets
                  .filter((asset) => asset.assetId !== coverId)
                  .map((asset) => asset.assetId)
          ]
        : [coverId]
const responses = $input.all()
if (responses.length !== assetIds.length) {
    throw new Error("AI image result count does not match requested slides")
}
const renders = responses.map((response, index) => {
    const image = response.json.data?.[0]?.b64_json
    if (
        response.json.error ||
        response.json.data?.length !== 1 ||
        typeof image !== "string" ||
        image.length > 16 * 1024 * 1024 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(image)
    ) {
        throw new Error("AI image editing did not return one valid image")
    }
    return {
        placement: event.output,
        format: "jpeg",
        width: 1080,
        height: event.output === "story" ? 1920 : 1350,
        imageBase64: image,
        assetId: assetIds[index]
    }
})
return [
    {
        json: {
            jobId: event.jobId,
            executionId: String($execution.id),
            resultVersion: 1,
            status: "READY_FOR_REVIEW",
            ...analysis,
            ...content,
            renders
        }
    }
]
