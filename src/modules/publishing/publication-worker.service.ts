import type { IPublishingRepository } from "./interfaces/publishing.repository.interface"
import type { Publication } from "./entities/publication.entity"
import type { IInstagramApi } from "../instagram/interfaces/instagram.interface"
import { InstagramService } from "../instagram/instagram.service"
import { InstagramApiError } from "../instagram/adapters/graph-api.adapter"
import { PublicationMediaService } from "./publication-media.service"
import { logger } from "../../core/helpers/logger"

/** Persist the publish intent before the network call. Uncertain writes are reconciled, never blindly replayed. */
export class PublicationWorker {
    constructor(
        private readonly repository: IPublishingRepository,
        private readonly api: IInstagramApi,
        private readonly accounts: InstagramService,
        private readonly media: PublicationMediaService
    ) {}

    async tick() {
        for (const publicationId of await this.repository.duePublicationIds()) {
            try {
                await this.process(publicationId)
            } catch {
                logger.warn("Publication worker could not persist progress", { publicationId })
            }
        }
    }

    async process(publicationId: string) {
        let row = await this.repository.transaction(async (store) => {
            const current = await store.get("publication", publicationId, true)
            if (
                !current ||
                !["QUEUED", "SCHEDULED", "PROCESSING", "PUBLISHING", "UNKNOWN"].includes(
                    current.status
                ) ||
                current.nextAttemptAt.getTime() > Date.now() ||
                (current.lockedUntil && current.lockedUntil.getTime() > Date.now())
            ) {
                return null
            }
            return store.save("publication", {
                ...current,
                lockToken: crypto.randomUUID(),
                lockedUntil: new Date(Date.now() + 120000)
            })
        })
        if (!row) {
            return
        }
        const token = row.lockToken
        const update = async (patch: Partial<Publication>) => {
            const saved = await this.repository.transaction(async (store) => {
                const current = await store.get("publication", publicationId, true)
                if (!current || current.lockToken !== token) {
                    throw new Error("Publication lease lost")
                }
                return store.save("publication", { ...current, ...patch })
            })
            row = saved
        }
        const release = (patch: Partial<Publication>) =>
            update({ ...patch, lockedUntil: null, lockToken: null })
        try {
            const { account } = await this.accounts.requireAccount(row.accountKey)
            if (account.instagramUserId !== row.snapshot.instagramUserId) {
                throw new Error("Account identity changed")
            }
            if (row.status === "PUBLISHING" || row.status === "UNKNOWN") {
                const status = row.containerId
                    ? await this.api.status(row.accountKey, row.containerId)
                    : "UNKNOWN"
                if (status === "PUBLISHED") {
                    await release({
                        status: "PUBLISHED",
                        publishedAt: row.publishedAt || new Date(),
                        safeError: null
                    })
                } else {
                    // Even an expired/errored response after an ambiguous publish must not create a second post.
                    await release({
                        status: "UNKNOWN",
                        safeError:
                            "Publication outcome is uncertain; verify the Instagram account before taking further action",
                        nextAttemptAt: new Date(Date.now() + 300000)
                    })
                }
                return
            }
            if (!row.containerId) {
                await update({ status: "PROCESSING", attemptCount: row.attemptCount + 1 })
                const url = await this.media.url(row.mediaKey)
                const containerId = await this.api.create(
                    row.accountKey,
                    url,
                    row.snapshot.caption,
                    row.snapshot.placement
                )
                await update({ containerId, containerCreatedAt: new Date() })
                await release({ nextAttemptAt: new Date(Date.now() + 15000) })
                return
            }
            const state = await this.api.status(row.accountKey, row.containerId)
            if (state === "IN_PROGRESS") {
                if (
                    row.containerCreatedAt &&
                    Date.now() - row.containerCreatedAt.getTime() > 10 * 60000
                ) {
                    await release({
                        status: "FAILED",
                        safeError: "Instagram media processing timed out"
                    })
                } else {
                    await release({ nextAttemptAt: new Date(Date.now() + 30000) })
                }
                return
            }
            if (state === "PUBLISHED") {
                await release({ status: "PUBLISHED", publishedAt: new Date(), safeError: null })
                return
            }
            if (state !== "FINISHED") {
                await release({
                    status: "FAILED",
                    safeError: "Instagram media container failed or expired"
                })
                return
            }
            await update({ status: "PUBLISHING" })
            const mediaId = await this.api.publish(row.accountKey, row.containerId)
            // Persist success before optional permalink lookup. A lookup error cannot turn a published post into a retry.
            await update({ status: "PUBLISHED", mediaId, publishedAt: new Date(), safeError: null })
            let permalink: string | null = null
            try {
                permalink = await this.api.permalink(row.accountKey, mediaId)
            } catch {
                /* publication already confirmed */
            }
            await release({ permalink })
        } catch (error) {
            if (row.status === "PUBLISHED") {
                await release({})
            } else if (row.status === "PUBLISHING" || row.status === "UNKNOWN") {
                await release({
                    status: "UNKNOWN",
                    safeError:
                        "Publication outcome is uncertain; verify the Instagram account before taking further action",
                    nextAttemptAt: new Date(Date.now() + 60000)
                })
            } else if (
                error instanceof InstagramApiError &&
                error.retryable &&
                row.attemptCount < 5
            ) {
                await release({
                    attemptCount: row.attemptCount + 1,
                    safeError: "Instagram is temporarily unavailable; retrying",
                    nextAttemptAt: new Date(Date.now() + 60000 * Math.max(1, row.attemptCount))
                })
            } else {
                await release({
                    status: "FAILED",
                    safeError:
                        "Instagram publishing failed; check the account credentials, permissions and media"
                })
            }
        }
    }
}
