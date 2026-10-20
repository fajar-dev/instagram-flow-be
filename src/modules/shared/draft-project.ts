import { NotFoundException } from "../../core/exceptions/base"
import type { WorkflowStore } from "./interfaces/workflow.repository.interface"

/** All draft mutations lock project before draft, including publication/rejection races. */
export async function lockDraftProject(store: WorkflowStore, draftId: string) {
    const initial = await store.get("draft", draftId)
    if (!initial) {
        throw new NotFoundException("Draft not found")
    }
    const job = await store.get("job", initial.jobId)
    if (!job) {
        throw new NotFoundException("Job not found")
    }
    const batch = await store.get("batch", job.batchId, true)
    if (!batch) {
        throw new NotFoundException("Batch not found")
    }
    const draft = await store.get("draft", draftId, true)
    if (!draft) {
        throw new NotFoundException("Draft not found")
    }
    return { draft, job, batch }
}
