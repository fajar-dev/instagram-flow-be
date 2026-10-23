import { config } from "../../config/config"
import { BadRequestException } from "../../core/exceptions/base"
import { isHttpsUrl } from "../../core/helpers/url"
import type { User } from "../user/entities/user.entity"
import type { IWorkflowRepository } from "../shared/interfaces/workflow.repository.interface"
import { WorkflowContextService } from "../shared/context.service"

/** Persisted dispatcher control; deployment configuration remains in environment. */
export class SettingsService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly context: WorkflowContextService
    ) {}

    async dispatchEnabled() {
        return (
            (await this.repository.find("setting", { key: "dispatch" }))[0]?.nonSecretValue
                .enabled === true
        )
    }

    readiness() {
        return {
            webhookConfigured:
                isHttpsUrl(config.n8n.webhookUrl) && Boolean(config.n8n.webhookToken),
            serviceConfigured: Boolean(config.n8n.serviceToken),
            storageConfigured: Boolean(
                config.minio.endPoint &&
                config.minio.accessKey &&
                config.minio.secretKey &&
                config.minio.bucket
            )
        }
    }

    isReady() {
        return Object.values(this.readiness()).every(Boolean)
    }

    async settings() {
        return {
            dispatchEnabled: await this.dispatchEnabled(),
            ready: this.isReady(),
            ...this.readiness()
        }
    }

    async updateSettings(actor: User, dispatchEnabled: boolean) {
        if (dispatchEnabled && !this.isReady()) {
            throw new BadRequestException(
                "Configure HTTPS webhook, object storage and integration secrets first"
            )
        }

        await this.repository.transaction(async (store) => {
            const settings = (await store.find("setting", { key: "dispatch" }))[0]
            await store.save("setting", {
                id: settings?.id || "00000000-0000-4000-8000-000000000001",
                key: "dispatch",
                nonSecretValue: { enabled: dispatchEnabled },
                updatedBy: actor.id
            })
            await this.context.audit(store, actor, "SETTINGS_CHANGED", "setting", "dispatch", {
                enabled: dispatchEnabled
            })
        })

        return this.settings()
    }
}
