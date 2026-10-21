import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/** Secrets belong to encrypted n8n credentials, never this deployment artifact. */
export function buildWorkflow() {
    const nodes: Record<string, any>[] = []
    const connections: Record<string, any> = {}
    const credential = (id: string, name: string) => ({ httpHeaderAuth: { id, name } })
    const backend = credential("igFlowBackendAuth", "IG Flow Backend")
    const ai = credential("igFlowAiGateway", "IG Flow AI Gateway")

    function node(name: string, type: string, version: number, parameters: any, extra = {}) {
        nodes.push({
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name,
            type: `n8n-nodes-base.${type}`,
            typeVersion: version,
            position: [nodes.length * 240, 0],
            parameters,
            ...extra
        })
    }

    function link(from: string, to: string, output = 0) {
        const main = (connections[from] ??= { main: [] }).main
        while (main.length <= output) {
            main.push([])
        }
        main[output].push({ node: to, type: "main", index: 0 })
    }

    function code(name: string, file: string, failure = true) {
        node(
            name,
            "code",
            2,
            { jsCode: readFileSync(join(import.meta.dir, "nodes", file), "utf8") },
            failure ? { onError: "continueErrorOutput" } : {}
        )
        if (failure) {
            link(name, "Callback Failure", 1)
        }
    }

    function condition(name: string, expression: string) {
        node(name, "if", 2.2, {
            conditions: {
                options: { caseSensitive: true, typeValidation: "strict", version: 2 },
                combinator: "and",
                conditions: [
                    {
                        id: name,
                        leftValue: expression,
                        rightValue: true,
                        operator: { type: "boolean", operation: "true", singleValue: true }
                    }
                ]
            },
            options: {}
        })
    }

    function http(name: string, url: string, credentials: any, body?: string, failure = true) {
        node(
            name,
            "httpRequest",
            4.2,
            {
                method: body ? "POST" : "GET",
                url,
                authentication: "genericCredentialType",
                genericAuthType: "httpHeaderAuth",
                ...(body ? { sendBody: true, specifyBody: "json", jsonBody: body } : {}),
                options: {
                    timeout: 180000,
                    ...(name === "Analyze Photos"
                        ? { batching: { batch: { batchSize: 1, batchInterval: 3000 } } }
                        : {})
                }
            },
            {
                credentials,
                retryOnFail: true,
                maxTries: 3,
                waitBetweenTries: 2000,
                ...(failure ? { onError: "continueErrorOutput" } : {})
            }
        )
        if (failure) {
            link(name, "Callback Failure", 1)
        }
    }

    const jobUrl = (action: string) =>
        `={{ $('Configuration').first().json.backendUrl + '/api/jobs/' + $('Validate Event').first().json.jobId + '/${action}' }}`
    node(
        "Receive Job",
        "webhook",
        2.1,
        {
            httpMethod: "POST",
            path: "ig-flow/process",
            authentication: "headerAuth",
            responseMode: "responseNode",
            options: {}
        },
        {
            webhookId: "ig-flow-process-v3",
            credentials: credential("igFlowWebhookAuth", "IG Flow Webhook")
        }
    )
    code("Validate Event", "validate-event.js", false)
    condition("Valid Event", "={{ $json.valid }}")
    node("Reject Event", "respondToWebhook", 1.4, {
        respondWith: "json",
        responseBody: '{"accepted":false}',
        options: { responseCode: 400 }
    })
    node("Accept Event", "respondToWebhook", 1.4, {
        respondWith: "json",
        responseBody: '{"accepted":true}',
        options: { responseCode: 202 }
    })
    node("Configuration", "code", 2, {
        jsCode: "return [{json:{backendUrl:'https://n8n.fajarchan.my.id/ig-flow-api',aiUrl:'http://43.173.33.252:20128/v1/chat/completions',model:'cx/gpt-5.6-luna'}}];"
    })
    // Never fail a job if the claim failed: another execution may own it.
    http(
        "Claim Job",
        jobUrl("claim"),
        backend,
        "={{ {executionId:String($execution.id),eventId:$('Validate Event').first().json.eventId} }}",
        false
    )
    condition("Claim Accepted", "={{ $json.claimed }}")
    http("Get Manifest", jobUrl("manifest"), backend)
    code("Prepare Analysis", "prepare-analysis.js")
    http("Analyze Photos", "={{ $('Configuration').first().json.aiUrl }}", ai, "={{ $json }}")
    code("Parse Analysis", "parse-analysis.js")
    code("Prepare Caption", "prepare-caption.js")
    http("Generate Caption", "={{ $('Configuration').first().json.aiUrl }}", ai, "={{ $json }}")
    code("Parse Caption", "parse-caption.js")
    code("Render Result", "render-result.js")
    http("Callback Result", jobUrl("result"), backend, "={{ $json }}")
    http(
        "Callback Failure",
        jobUrl("failure"),
        backend,
        "={{ {executionId:String($execution.id),stage:'processing',errorCode:'WORKFLOW_ERROR',safeMessage:'Workflow processing failed',retryable:true} }}",
        false
    )
    node("Mark Execution Failed", "stopAndError", 1, {
        errorMessage:
            "IG Flow processing failed; backend notified. Inspect the failed node before retrying."
    })
    link("Callback Failure", "Mark Execution Failed")
    link("Receive Job", "Validate Event")
    link("Validate Event", "Valid Event")
    link("Valid Event", "Accept Event")
    link("Valid Event", "Reject Event", 1)
    const chain = [
        "Accept Event",
        "Configuration",
        "Claim Job",
        "Claim Accepted",
        "Get Manifest",
        "Prepare Analysis",
        "Analyze Photos",
        "Parse Analysis",
        "Prepare Caption",
        "Generate Caption",
        "Parse Caption",
        "Render Result",
        "Callback Result"
    ]
    for (let i = 0; i < chain.length - 1; i++) {
        link(chain[i]!, chain[i + 1]!)
    }
    const placements: Record<string, number[]> = {
        "Reject Event": [720, -240],
        "Callback Failure": [2400, 480],
        "Mark Execution Failed": [2640, 480]
    }
    for (const node of nodes) {
        if (placements[node.name]) {
            node.position = placements[node.name]
        }
    }
    return {
        id: "igFlowContentV3",
        name: "IG Flow — AI Content and Review",
        active: false,
        nodes,
        connections,
        settings: {
            executionOrder: "v1",
            saveDataSuccessExecution: "all",
            saveDataErrorExecution: "all",
            executionTimeout: 1200
        },
        pinData: {}
    }
}
if (import.meta.main) {
    writeFileSync(
        join(import.meta.dir, "ig-flow.workflow.json"),
        JSON.stringify(buildWorkflow(), null, 2) + "\n"
    )
}
