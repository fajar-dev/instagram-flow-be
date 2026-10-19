import { ArchivePublicationAttempts1792382399999 } from './1792382399999-archive-publication-attempts'
import { PublicationProjectUniqueness1792382400000 } from './1792382400000-publication-project-uniqueness'
import { SimplifyDraftStatus1792382400001 } from './1792382400001-simplify-draft-status'
import { NormalizeReviewHistory1792382400002 } from './1792382400002-normalize-review-history'
import { CreatePublications1792371600000 } from './1792371600000-create-publications'
import { CreateUsers1792368000000 } from "./1792368000000-create-users"
import { CreatePasswordResetTokens1792368000001 } from "./1792368000001-create-password-reset-tokens"
import { CreateBatches1792368000002 } from "./1792368000002-create-batches"
import { CreateAssets1792368000003 } from "./1792368000003-create-assets"
import { CreateJobs1792368000004 } from "./1792368000004-create-jobs"
import { CreateJobDispatches1792368000005 } from "./1792368000005-create-job-dispatches"
import { CreateAiResults1792368000006 } from "./1792368000006-create-ai-results"
import { CreateRenders1792368000007 } from "./1792368000007-create-renders"
import { CreateDrafts1792368000008 } from "./1792368000008-create-drafts"
import { CreateDraftRevisions1792368000009 } from "./1792368000009-create-draft-revisions"
import { CreateReviews1792368000010 } from "./1792368000010-create-reviews"
import { CreateAuditLogs1792368000011 } from "./1792368000011-create-audit-logs"
import { CreateSettings1792368000012 } from "./1792368000012-create-settings"

export const databaseMigrations = [
    CreateUsers1792368000000,
    CreatePasswordResetTokens1792368000001,
    CreateBatches1792368000002,
    CreateAssets1792368000003,
    CreateJobs1792368000004,
    CreateJobDispatches1792368000005,
    CreateAiResults1792368000006,
    CreateRenders1792368000007,
    CreateDrafts1792368000008,
    CreateDraftRevisions1792368000009,
    CreateReviews1792368000010,
    CreateAuditLogs1792368000011,
    CreateSettings1792368000012,
    CreatePublications1792371600000,
    ArchivePublicationAttempts1792382399999,
    PublicationProjectUniqueness1792382400000,
    SimplifyDraftStatus1792382400001,
    NormalizeReviewHistory1792382400002,

]
