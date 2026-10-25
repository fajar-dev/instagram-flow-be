export type NotificationPart =
    { kind: "photo"; key: string; caption?: string } | { kind: "text"; text: string }

export interface ReadyContent {
    caption: string
    hashtags: string[]
    coverKey: string
}

/** Split without truncating text or separating UTF-16 surrogate pairs. */
export function splitTelegramText(text: string): string[] {
    const parts: string[] = []
    let remaining = text
    while (remaining.length > 4000) {
        let end = remaining.lastIndexOf("\n", 4000)
        if (end < 2000) {
            end = 4000
            const last = remaining.charCodeAt(end - 1)
            if (last >= 0xd800 && last <= 0xdbff) {
                end--
            }
        } else {
            end++
        }
        parts.push(remaining.slice(0, end))
        remaining = remaining.slice(end)
    }
    if (remaining) {
        parts.push(remaining)
    }
    return parts
}

export function notificationParts(content: ReadyContent): NotificationPart[] {
    const text = [content.caption, content.hashtags.join(" ")].filter(Boolean).join("\n\n")
    if (text.length <= 1024) {
        return [{ kind: "photo", key: content.coverKey, caption: text }]
    }
    return [
        { kind: "photo", key: content.coverKey },
        ...splitTelegramText(text).map((text) => ({ kind: "text" as const, text }))
    ]
}
