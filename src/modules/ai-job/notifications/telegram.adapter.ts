import sharp from "sharp"
import type { IContentMedia } from "../../content/media/interfaces/content-media.interface"
import type { JobNotification } from "./notification.entity"

export type TelegramDelivery =
    | { status: "SENT"; messageId: string }
    | { status: "RETRY"; retryAfter: number }
    | { status: "FAILED" | "UNKNOWN" }

export interface ITelegramTransport {
    send(notification: JobNotification): Promise<TelegramDelivery>
}

export class TelegramTransport implements ITelegramTransport {
    constructor(
        private readonly token: string,
        private readonly media: Pick<IContentMedia, "get">,
        private readonly request: typeof fetch = fetch
    ) {}

    async send(notification: JobNotification): Promise<TelegramDelivery> {
        const part = notification.parts[notification.nextPart]
        if (!part) {
            return { status: "FAILED" }
        }
        const button = {
            inline_keyboard: [[{ text: "Buka detail konten", url: notification.detailUrl }]]
        }
        let body: string | FormData
        if (part.kind === "photo") {
            try {
                let bytes = await this.media.get(part.key)
                if (bytes.length > 9 * 1024 * 1024) {
                    bytes = await sharp(bytes, { limitInputPixels: 40000000 })
                        .resize({ width: 1080, withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toBuffer()
                }
                if (bytes.length > 10 * 1024 * 1024) {
                    return { status: "FAILED" }
                }
                const form = new FormData()
                form.set("chat_id", notification.chatId)
                form.set(
                    "photo",
                    new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
                    "cover.jpg"
                )
                form.set("caption", part.caption ?? "")
                form.set("reply_markup", JSON.stringify(button))
                body = form
            } catch {
                // Nothing has been sent yet: storage failures are safe to retry.
                return { status: "RETRY", retryAfter: 60 }
            }
        } else {
            body = JSON.stringify({
                chat_id: notification.chatId,
                text: part.text,
                link_preview_options: { is_disabled: true },
                reply_markup: button
            })
        }
        try {
            const response = await this.request(
                `https://api.telegram.org/bot${this.token}/${part.kind === "photo" ? "sendPhoto" : "sendMessage"}`,
                {
                    method: "POST",
                    redirect: "error",
                    signal: AbortSignal.timeout(60000),
                    ...(typeof body === "string"
                        ? { headers: { "Content-Type": "application/json" } }
                        : {}),
                    body
                }
            )
            const result = (await response.json()) as {
                ok?: boolean
                result?: { message_id?: number }
                parameters?: { retry_after?: number }
            }
            if (
                response.ok &&
                result.ok === true &&
                Number.isSafeInteger(result.result?.message_id)
            ) {
                return { status: "SENT", messageId: String(result.result!.message_id) }
            }
            if (response.status === 429 && result.ok === false) {
                const delay = result.parameters?.retry_after
                return {
                    status: "RETRY",
                    retryAfter: Number.isSafeInteger(delay) && delay! > 0 ? delay! : 60
                }
            }
            return {
                status: response.status >= 400 && response.status < 500 ? "FAILED" : "UNKNOWN"
            }
        } catch {
            // A timeout may occur after Telegram accepted the message. Never log its token-bearing URL.
            return { status: "UNKNOWN" }
        }
    }
}
