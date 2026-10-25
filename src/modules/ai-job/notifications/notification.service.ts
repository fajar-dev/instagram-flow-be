import { notificationParts, type ReadyContent } from "./notification-content"
import type {
    IWorkflowRepository,
    WorkflowStore
} from "../../shared/interfaces/workflow.repository.interface"
import type { ITelegramTransport, TelegramDelivery } from "./telegram.adapter"
import { id } from "../../shared/workflow.helpers"
import { logger } from "../../../core/helpers/logger"

export interface NotificationSettings {
    botToken: string
    chatId: string
    frontendUrl: string
}

export class JobNotificationService {
    constructor(
        private readonly repository: IWorkflowRepository,
        private readonly transport: ITelegramTransport,
        private readonly settings: NotificationSettings
    ) {}

    async enqueue(
        store: WorkflowStore,
        jobId: string,
        projectName: string,
        output: "feed" | "story",
        content: ReadyContent
    ) {
        if (!this.settings.botToken || !this.settings.chatId) {
            return
        }
        await store.save("notification", {
            id: id(),
            jobId,
            projectName,
            output,
            chatId: this.settings.chatId,
            detailUrl: `${this.settings.frontendUrl.replace(/\/$/, "")}/content/${jobId}`,
            parts: notificationParts(content),
            nextPart: 0,
            status: "PENDING",
            attemptNo: 0,
            nextRetryAt: new Date(),
            lockedUntil: null,
            messageId: null
        })
    }

    async tick() {
        if (!this.settings.botToken || !this.settings.chatId) {
            return
        }
        for (const notificationId of await this.repository.dueNotificationIds()) {
            const notification = await this.repository.transaction(async (store) => {
                const row = await store.get("notification", notificationId, true)
                if (
                    !row ||
                    row.nextRetryAt > new Date() ||
                    (row.lockedUntil && row.lockedUntil > new Date())
                ) {
                    return null
                }
                if (row.status === "SENDING") {
                    // Crash after send: stop rather than duplicate a message with an unknown outcome.
                    await store.save("notification", {
                        ...row,
                        status: "UNKNOWN",
                        lockedUntil: null
                    })
                    logger.warn("Telegram notification delivery requires inspection", {
                        notificationId
                    })
                    return null
                }
                if (row.status !== "PENDING") {
                    return null
                }
                return store.save("notification", {
                    ...row,
                    status: "SENDING",
                    attemptNo: row.attemptNo + 1,
                    lockedUntil: new Date(Date.now() + 180000)
                })
            })
            if (!notification) {
                continue
            }
            let delivery: TelegramDelivery
            try {
                delivery = await this.transport.send(notification)
            } catch {
                delivery = { status: "UNKNOWN" }
            }
            await this.repository.transaction(async (store) => {
                const current = await store.get("notification", notificationId, true)
                if (
                    !current ||
                    current.status !== "SENDING" ||
                    current.attemptNo !== notification.attemptNo ||
                    current.nextPart !== notification.nextPart
                ) {
                    return
                }
                const retry = delivery.status === "RETRY" && current.attemptNo < 5
                const nextPart = current.nextPart + (delivery.status === "SENT" ? 1 : 0)
                const status =
                    delivery.status === "RETRY"
                        ? retry
                            ? "PENDING"
                            : "FAILED"
                        : delivery.status === "SENT" && nextPart < current.parts.length
                          ? "PENDING"
                          : delivery.status
                await store.save("notification", {
                    ...current,
                    status,
                    nextPart,
                    attemptNo: delivery.status === "SENT" ? 0 : current.attemptNo,
                    lockedUntil: null,
                    messageId: delivery.status === "SENT" ? delivery.messageId : current.messageId,
                    nextRetryAt:
                        retry && delivery.status === "RETRY"
                            ? new Date(Date.now() + delivery.retryAfter * 1000)
                            : new Date(Date.now() + 1000)
                })
                if (status === "FAILED" || status === "UNKNOWN") {
                    logger.warn("Telegram notification delivery requires inspection", {
                        notificationId,
                        status
                    })
                }
            })
        }
    }
}
