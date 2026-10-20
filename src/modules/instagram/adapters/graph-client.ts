import { InstagramService } from "../instagram.service"
import type { z } from "zod"
import { graphError } from "./graph-response"

export class InstagramApiError extends Error {
    constructor(
        public readonly code: number,
        public readonly retryable: boolean,
        public readonly metricUnavailable: boolean = false
    ) {
        super(`Instagram API request failed (${code})`)
    }
}

/** Fixed Graph host, bounded requests, no provider payload/token in errors or logs. */
export class GraphInstagramClient {
    constructor(
        protected readonly accounts: InstagramService,
        private readonly transport: typeof fetch = fetch
    ) {}

    async request<T extends z.ZodType>(
        key: string,
        path: string | null,
        method: "GET" | "POST",
        fields: Record<string, string>,
        schema: T
    ): Promise<z.output<T>> {
        const { account, graphVersion } = await this.accounts.requireAccount(key)
        const url = new URL(
            `https://graph.instagram.com/${graphVersion}/${path ?? account.instagramUserId}`
        )
        const params = new URLSearchParams(fields)
        if (method === "GET") {
            url.search = params.toString()
        }
        let response: Response
        try {
            response = await this.transport(url, {
                method,
                headers: {
                    Authorization: `Bearer ${account.accessToken}`,
                    ...(method === "POST"
                        ? { "Content-Type": "application/x-www-form-urlencoded" }
                        : {})
                },
                body: method === "POST" ? params.toString() : undefined,
                signal: AbortSignal.timeout(20000),
                redirect: "error"
            })
        } catch {
            throw new InstagramApiError(0, true)
        }
        let data: unknown
        try {
            data = await response.json()
        } catch {
            throw new InstagramApiError(response.status, true)
        }
        const envelope = graphError.safeParse(data)
        const error = envelope.success ? envelope.data.error : undefined
        if (!response.ok || error) {
            throw new InstagramApiError(
                Number(error?.code || response.status),
                response.status >= 500 ||
                    response.status === 429 ||
                    [1, 2, 4, 17, 32, 613].includes(Number(error?.code)) ||
                    error?.is_transient === true,
                (error?.code === 10 && /not enough viewers/i.test(error.message || "")) ||
                    (error?.code === 100 && /metric/i.test(error.message || ""))
            )
        }
        const parsed = schema.safeParse(data)
        if (!parsed.success) {
            throw new InstagramApiError(0, true)
        }
        return parsed.data
    }
}
