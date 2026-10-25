import {
    notificationParts,
    splitTelegramText
} from "../src/modules/ai-job/notifications/notification-content"
import { expect, test } from "bun:test"
import { TelegramTransport } from "../src/modules/ai-job/notifications/telegram.adapter"
import type { JobNotification } from "../src/modules/ai-job/notifications/notification.entity"
import { createConfig } from "../src/config/config"

const media = {
    async get() {
        return Buffer.from("jpeg-test")
    }
}

const notification = {
    parts: [{ kind: "text", text: "Konten berhasil diproses\nProyek: <b>Bridge</b>" }],
    nextPart: 0,
    projectName: "<b>Bridge</b>",
    output: "feed",
    chatId: "-100123",
    detailUrl: "https://app.test/content/job-id"
} as JobNotification

test("Telegram sends plain text and a detail URL button without exposing authentication", async () => {
    const request = (async (url: string, options: RequestInit) => {
        expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage")
        const body = JSON.parse(String(options.body))
        expect(body.chat_id).toBe("-100123")
        expect(body.text).toContain("<b>Bridge</b>")
        expect(body.parse_mode).toBeUndefined()
        expect(body.reply_markup.inline_keyboard[0][0]).toEqual({
            text: "Buka detail konten",
            url: notification.detailUrl
        })
        expect(body.reply_markup.inline_keyboard[0][0].url).not.toContain("token")
        expect(options.redirect).toBe("error")
        expect(options.signal).toBeDefined()
        return Response.json({ ok: true, result: { message_id: 42 } })
    }) as typeof fetch
    expect(await new TelegramTransport("test-token", media, request).send(notification)).toEqual({
        status: "SENT",
        messageId: "42"
    })
})

test("Telegram retries only explicit rate limiting and preserves ambiguous outcomes", async () => {
    for (const [status, body, expected] of [
        [429, { ok: false, parameters: { retry_after: 45 } }, { status: "RETRY", retryAfter: 45 }],
        [403, { ok: false }, { status: "FAILED" }],
        [500, { ok: false }, { status: "UNKNOWN" }],
        [200, { ok: true }, { status: "UNKNOWN" }]
    ] as const) {
        const request = (async () => Response.json(body, { status })) as unknown as typeof fetch
        expect(
            await new TelegramTransport("test-token", media, request).send(notification)
        ).toEqual(expected)
    }
    const request = (async () => {
        throw new Error("network error with a secret URL")
    }) as unknown as typeof fetch
    expect(await new TelegramTransport("test-token", media, request).send(notification)).toEqual({
        status: "UNKNOWN"
    })
})

test("Telegram is optional and requires complete configuration and a safe frontend URL", () => {
    expect(createConfig({}).telegram.botToken).toBe("")
    expect(() => createConfig({ TELEGRAM_BOT_TOKEN: "token" })).toThrow("configured together")
    expect(() => createConfig({ TELEGRAM_CHAT_ID: "123" })).toThrow("configured together")
    expect(() =>
        createConfig({
            TELEGRAM_BOT_TOKEN: "token",
            TELEGRAM_CHAT_ID: "123",
            FRONTEND_URL: "javascript:alert(1)"
        })
    ).toThrow()
    expect(
        createConfig({
            TELEGRAM_BOT_TOKEN: "token",
            TELEGRAM_CHAT_ID: "123",
            FRONTEND_URL: "https://app.test"
        }).telegram.chatId
    ).toBe("123")
})

test("Telegram uploads only the cover with a detail button", async () => {
    const request = (async (url: string, options: RequestInit) => {
        expect(url.endsWith("/sendPhoto")).toBe(true)
        const body = options.body as FormData
        expect(await (body.get("photo") as Blob).text()).toBe("jpeg-test")
        expect(body.get("chat_id")).toBe(notification.chatId)
        expect(body.get("caption")).toBe("Caption #AMTI")
        expect(JSON.parse(String(body.get("reply_markup"))).inline_keyboard[0][0].url).toBe(
            notification.detailUrl
        )
        return Response.json({ ok: true, result: { message_id: 43 } })
    }) as typeof fetch
    expect(
        await new TelegramTransport("test-token", media, request).send({
            ...notification,
            parts: [{ kind: "photo", key: "cover.jpg", caption: "Caption #AMTI" }]
        })
    ).toEqual({ status: "SENT", messageId: "43" })
})

test("Cover read failure retries before making a Telegram request", async () => {
    const failingMedia = {
        async get(): Promise<Buffer> {
            throw new Error("storage unavailable")
        }
    }
    const request = (async () => {
        throw new Error("must not send")
    }) as unknown as typeof fetch
    expect(
        await new TelegramTransport("test-token", failingMedia, request).send({
            ...notification,
            parts: [{ kind: "photo", key: "cover.jpg" }]
        })
    ).toEqual({ status: "RETRY", retryAfter: 60 })
})

test("Notification retains complete content and only one cover", () => {
    const caption = "Caption 😀\n".repeat(1000)
    expect(splitTelegramText(caption).join("")).toBe(caption)
    expect(splitTelegramText(caption).every((part) => part.length <= 4096)).toBe(true)
    const parts = notificationParts({ caption, hashtags: ["#AMTI"], coverKey: "cover.jpg" })
    expect(parts.filter((part) => part.kind === "photo")).toEqual([
        { kind: "photo", key: "cover.jpg" }
    ])
    const text = parts
        .filter((part) => part.kind === "text")
        .map((part) => part.text)
        .join("")
    expect(text).toBe(`${caption}\n\n#AMTI`)
})

test("Short content is one photo caption without project metadata", () => {
    expect(
        notificationParts({ caption: "Instalasi SHMS", hashtags: ["#AMTI"], coverKey: "cover.jpg" })
    ).toEqual([{ kind: "photo", key: "cover.jpg", caption: "Instalasi SHMS\n\n#AMTI" }])
    expect(notificationParts({ caption: "", hashtags: [], coverKey: "story.jpg" })).toEqual([
        { kind: "photo", key: "story.jpg", caption: "" }
    ])
    expect(
        notificationParts({ caption: "a".repeat(1024), hashtags: [], coverKey: "cover.jpg" })
    ).toHaveLength(1)
    expect(
        notificationParts({ caption: "a".repeat(1025), hashtags: [], coverKey: "cover.jpg" })
    ).toHaveLength(2)
})
