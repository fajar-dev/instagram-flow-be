const mapping: Record<string, string> = {
    event_id: "eventId",
    job_id: "jobId",
    batch_id: "batchId",
    requested_by: "requestedBy",
    requested_outputs: "requestedOutputs",
    project_name: "projectName",
    review_url: "reviewUrl",
    asset_id: "assetId",
    ai_image_url: "aiImageUrl",
    render_image_url: "renderImageUrl",
    execution_id: "executionId",
    result_version: "resultVersion",
    selected_asset_ids: "selectedAssetIds",
    safe_message: "safeMessage",
    error_code: "errorCode"
}
const reverse = Object.fromEntries(Object.entries(mapping).map(([a, b]) => [b, a]))

/** Only integration-owned keys are translated; unknown provider fields remain intact. */
function translate(value: unknown, keys: Record<string, string>): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => translate(item, keys))
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [keys[key] || key, translate(item, keys)])
        )
    }
    return value
}

export const fromLegacy = (value: unknown) => translate(value, mapping)

export const toLegacy = (value: unknown) => translate(value, reverse)
