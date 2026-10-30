import { lockDraftProject } from "../shared/draft-project"
import {
    BadRequestException,
    ConflictException,
    NotFoundException
} from "../../core/exceptions/base"
import type { User } from "../user/entities/user.entity"
import { InstagramService } from "../instagram/instagram.service"
import type { IPublishingRepository } from "./interfaces/publishing.repository.interface"
import { PublicationMediaService } from "./publication-media.service"
import type { PublicationInput } from "./validators/publication.validator"
import { contentHash, id } from "../shared/workflow.helpers"
import { idempotencyKey } from "../shared/validators/shared.validator"
import { WorkflowContextService } from "../shared/context.service"
import { logger } from "../../core/helpers/logger"

export class PublishingService {
    constructor(
        private readonly repository: IPublishingRepository,
        private readonly accounts: InstagramService,
        private readonly media: PublicationMediaService,
        private readonly context: WorkflowContextService
    ) {}

    async list(draftId: string) {
        if (!(await this.repository.get("draft", draftId))) {
            throw new NotFoundException("Draft not found")
        }
        return this.repository.find("publication", { draftId })
    }

    async enqueue(actor: User, draftId: string, input: PublicationInput, key: string) {
        idempotencyKey.parse(key)
        const hash = contentHash(input)
        const createdMedia: string[] = []
        try {
            return await this.repository.transaction(async (store) => {
                const { draft, batch } = await lockDraftProject(store, draftId)
                const previous = await store.find("publication", { draftId, requestKey: key })
                if (previous.length) {
                    if (previous.some((p) => p.requestHash !== hash)) {
                        throw new ConflictException("Publication request key was already used")
                    }
                    return previous[0]!
                }
                const job = await this.context.job(draft.jobId, store)
                if (job.output !== input.placement) {
                    throw new BadRequestException("Publication must match the selected job output")
                }
                const content = input.content
                if (
                    draft.contentHash !== input.expectedContentHash ||
                    draft.decisionStatus !== "READY_FOR_REVIEW"
                ) {
                    throw new ConflictException("Only current ready content can be published")
                }
                const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date()
                if (input.scheduledAt && scheduledAt.getTime() < Date.now() + 60000) {
                    throw new BadRequestException(
                        "Schedule must be at least one minute in the future"
                    )
                }
                const caption = [content.caption, content.hashtags.join(" ")]
                    .filter(Boolean)
                    .join("\n\n")
                if (input.placement === "feed" && Array.from(caption).length > 2200) {
                    throw new BadRequestException("Instagram caption exceeds 2200 characters")
                }
                if ((await store.find("publication", { batchId: batch.id })).length) {
                    throw new ConflictException("Project already has a publication")
                }
                const { account } = await this.accounts.requireAccount(input.accountKey)
                const results = await store.find("aiResult", { jobId: draft.jobId })
                const available = results[0]
                    ? await store.find("render", { aiResultId: results[0].id })
                    : []
                const selected = input.renderIds.map((renderId) =>
                    available.find((r) => r.id === renderId && r.placement === input.placement)
                )
                if (selected.some((r) => !r)) {
                    throw new BadRequestException("Requested design is unavailable")
                }
                for (const render of selected) {
                    const key = await this.media.prepare(render!.storageKey, input.placement, id())
                    createdMedia.push(key)
                    await this.media.url(key)
                }
                // Freeze order and media bytes together with the publication decision.
                const publication = await store.save("publication", {
                    id: id(),
                    batchId: batch.id,
                    draftId,
                    accountKey: account.key,
                    requestKey: key,
                    requestHash: hash,
                    snapshot: {
                        title: content.title,
                        caption,
                        hashtags: content.hashtags,
                        contentHash: contentHash(content),
                        mediaKeys: createdMedia,
                        renderIds: input.renderIds,
                        placement: input.placement,
                        accountLabel: account.label,
                        instagramUserId: account.instagramUserId
                    },
                    childContainerIds: [],
                    status: input.scheduledAt ? "SCHEDULED" : "QUEUED",
                    scheduledAt,
                    nextAttemptAt: scheduledAt,
                    lockedUntil: null,
                    lockToken: null,
                    containerId: null,
                    containerCreatedAt: null,
                    mediaId: null,
                    permalink: null,
                    safeError: null,
                    attemptCount: 0,
                    publishedAt: null,
                    createdBy: actor.id
                })
                await this.context.audit(
                    store,
                    actor,
                    "PUBLICATION_QUEUED",
                    "publication",
                    publication.id,
                    { accountKey: account.key }
                )
                await store.save("draft", {
                    ...draft,
                    ...content,
                    contentHash: contentHash(content),
                    decisionStatus: "PUBLISH"
                })
                return publication
            })
        } catch (error) {
            if (createdMedia.length) {
                try {
                    await Promise.all(createdMedia.map((key) => this.media.remove(key)))
                } catch {
                    logger.warn("Publication media cleanup required")
                }
            }
            throw error
        }
    }

    async cancel(actor: User, publicationId: string) {
        const existing = await this.repository.get("publication", publicationId)
        if (!existing) {
            throw new NotFoundException("Publication not found")
        }
        return this.repository.transaction(async (store) => {
            const { draft } = await lockDraftProject(store, existing.draftId)
            const row = await store.get("publication", publicationId, true)
            if (!row) {
                throw new NotFoundException("Publication not found")
            }
            if (!["QUEUED", "SCHEDULED", "FAILED"].includes(row.status)) {
                throw new ConflictException("Publication can no longer be cancelled")
            }
            const result = await store.save("publication", {
                ...row,
                status: "CANCELLED",
                lockedUntil: null,
                lockToken: null
            })
            await store.save("draft", { ...draft, decisionStatus: "REJECTED" })
            await this.context.audit(
                store,
                actor,
                "PUBLICATION_CANCELLED",
                "publication",
                row.id,
                {}
            )
            return result
        })
    }

    async retry(actor: User, publicationId: string) {
        const existing = await this.repository.get("publication", publicationId)
        if (!existing) {
            throw new NotFoundException("Publication not found")
        }
        return this.repository.transaction(async (store) => {
            // Serialize retries with new publication requests for the same draft.
            await lockDraftProject(store, existing.draftId)
            const row = await store.get("publication", publicationId, true)
            if (!row) {
                throw new NotFoundException("Publication not found")
            }
            if (row.status !== "FAILED") {
                throw new ConflictException("Only a definitively failed publication can be retried")
            }
            const account = await this.accounts.requireAccount(row.accountKey)
            if (account.account.instagramUserId !== row.snapshot.instagramUserId) {
                throw new ConflictException("Instagram account identity changed")
            }
            const result = await store.save("publication", {
                ...row,
                status: "QUEUED",
                nextAttemptAt: new Date(),
                attemptCount: 0,
                containerId: null,
                childContainerIds: [],
                containerCreatedAt: null,
                safeError: null,
                lockedUntil: null,
                lockToken: null
            })
            await this.context.audit(store, actor, "PUBLICATION_RETRIED", "publication", row.id, {})
            return result
        })
    }
}
