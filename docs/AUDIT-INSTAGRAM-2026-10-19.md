# Instagram live test — 19 October 2026

The user authorized actual immediate and scheduled publishing. Two existing synthetic test drafts with publication permission were approved through the domain service. No real project documentation was posted.

Immediate publication 15a088c6-cd60-4dfe-ba1e-00f25e8c3268 succeeded at 03:31:27 UTC for @fajar_chngo. Meta GET confirmed media 18092258987284439, IMAGE, timestamp 03:31:24 UTC and permalink https://www.instagram.com/p/DeqTDEyCdIC/.

Scheduled publication fde6984e-d091-46a0-b591-a5c1db31d90d was due at 03:33:01 UTC. Before the deadline it remained SCHEDULED without a container. It subsequently failed without a container. Credentials under the same account key were changed during the test: a subsequent /me request returned @beta_dev12, Instagram user ID 17841455483035409, rather than the original @fajar_chngo / 17841402272237130. Do not retarget the old snapshot to the new account or claim scheduled live publishing succeeded. A new explicitly targeted scheduled publication is needed to complete that test.

Fixed HTTPS-only application validation that rejected the existing public HTTP MinIO presigned endpoint. No public bucket policy was enabled. Backend validation: 153 tests passed, typecheck and build passed.
