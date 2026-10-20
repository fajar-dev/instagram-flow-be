import { minio } from "./minio"

/** Stored object keys resolve only to private MinIO presigned URLs. */
export async function resolveStorageUrl(path: string | null | undefined): Promise<string | null> {
    return path ? minio.getPresignedUrl(path) : null
}
