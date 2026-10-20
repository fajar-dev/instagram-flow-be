import { isHttpsUrl } from "../../../../core/helpers/url"
import { config } from "../../../../config/config"
import type { IWebhookTransport } from "../../dispatch.service"
import { BadRequestException } from "../../../../core/exceptions/base"

export class N8nWebhookTransport implements IWebhookTransport {
    async send(payload: unknown) {
        if (!isHttpsUrl(config.n8n.webhookUrl) || !config.n8n.webhookToken) {
            throw new BadRequestException("Webhook is not configured")
        }
        const response = await fetch(config.n8n.webhookUrl, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(config.n8n.timeoutMs),
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.n8n.webhookToken}`
            },
            body: JSON.stringify(payload)
        })
        await response.body?.cancel()
        return response.status
    }
}
