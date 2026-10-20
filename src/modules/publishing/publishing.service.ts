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

import type { WorkflowStore } from "../shared/interfaces/workflow.repository.interface"
import type { PublishContentInput } from "../content-review/validators/draft.validator"

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
        let createdMedia: string | null = null
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
                    draft.reviewStatus !== "READY_FOR_REVIEW"
                ) {
                    throw new ConflictException("Only current ready content can be published")
                }
                if (!batch?.publicationPermission) {
                    throw new BadRequestException("Publication permission is required")
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
                const sourceKey = await this.resolveSourceKey(
                    store,
                    batch.id,
                    draft.jobId,
                    content,
                    input
                )
                // Keep the draft lock until the immutable snapshot and publication are saved.
                createdMedia = await this.media.prepare(sourceKey, input.placement, id())
                await this.media.url(createdMedia) // Validate the storage URL protocol before saving the publication.
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
                        source: input.source,
                        placement: input.placement,
                        accountLabel: account.label,
                        instagramUserId: account.instagramUserId
                    },
                    mediaKey: createdMedia,
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
                    reviewStatus: "PUBLISH"
                })
                return publication
            })
        } catch (error) {
            if (createdMedia) {
                try {
                    await this.media.remove(createdMedia)
                } catch {
                    logger.warn("Publication media cleanup required")
                }
            }
            throw error
        }
    }

    private async resolveSourceKey(
        store: WorkflowStore,
        batchId: string,
        jobId: string,
        content: PublishContentInput,
        input: PublicationInput
    ) {
        const asset = await store.get("asset", content.primaryAssetId)
        if (!asset || asset.deletedAt || asset.batchId !== batchId) {
            throw new BadRequestException("Publication asset is unavailable")
        }
        let sourceKey = asset.safePreviewStorageKey
        if (input.source === "design") {
            const job = await this.context.job(jobId, store)
            const batch = await this.context.batch(job.batchId, store)
            const results = await store.find("aiResult", { jobId })
            const ai = results[0]
            const original = ai && {
                primaryAssetId: ai.selectedAssetIds[0],
                title: ai.rawTitle,
                caption: input.placement === "story" ? "" : ai.rawCaption,
                hashtags: input.placement === "story" ? [] : ai.rawHashtags,
                location: batch.location,
                activity: batch.activity
            }
            if (!original || contentHash(content) !== contentHash(original)) {
                throw new BadRequestException(
                    "Design preview is outdated; select the photo or regenerate content"
                )
            }
            const renders = await store.find("render", {
                assetId: asset.id,
                placement: input.placement
            })
            const render = renders.find((r) => results.some((result) => result.id === r.aiResultId))
            if (!render) {
                throw new BadRequestException("Requested design is unavailable")
            }
            sourceKey = render.storageKey
        }
        return sourceKey
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
            await store.save("draft", { ...draft, reviewStatus: "REJECTED" })
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
                containerCreatedAt: null,
                safeError: null,
                lockedUntil: null,
                lockToken: null
            })
            await this.context.audit(store, actor, "PUBLICATION_RETRIED", "publication", row.id, {})
            return result
        })
    }

    async image(publicationId: string) {
        const row = await this.repository.get("publication", publicationId)
        if (!row) {
            throw new NotFoundException("Publication not found")
        }
        return this.media.read(row.mediaKey)
    }
}
