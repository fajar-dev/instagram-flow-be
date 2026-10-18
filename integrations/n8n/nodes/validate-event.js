const body = $json.body;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!body || !uuid.test(body.jobId) || !uuid.test(body.eventId)
    || !Array.isArray(body.requestedOutputs) || !body.requestedOutputs.length
    || body.requestedOutputs.length > 2 || new Set(body.requestedOutputs).size !== body.requestedOutputs.length
    || body.requestedOutputs.some(value => !['feed', 'story'].includes(value))) {
    return [{ json: { valid: false } }];
}
return [{ json: { valid: true, jobId: body.jobId, eventId: body.eventId, requestedOutputs: body.requestedOutputs } }];
