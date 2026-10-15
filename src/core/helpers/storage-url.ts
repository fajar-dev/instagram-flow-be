import { minio } from "./minio"

/**
 * Opsi resolusi path object storage.
 */
export interface ResolveStorageUrlOptions {
    passthroughAbsolute?: boolean
    fallbackToPath?: boolean
}

/**
 * Mengubah path object storage (MinIO) menjadi URL yang bisa dipakai client.
 *
 * @param path - Object key relatif (mis. "users/avatar.png") atau URL absolut
 * @param options - Lihat ResolveStorageUrlOptions
 */
export async function resolveStorageUrl(
    path: string | null | undefined,
    options: ResolveStorageUrlOptions = {}
): Promise<string | null> {
    const { passthroughAbsolute = false, fallbackToPath = false } = options

    if (!path) return null

    if (passthroughAbsolute && (path.startsWith("http://") || path.startsWith("https://"))) {
        return path
    }

    try {
        return await minio.getPresignedUrl(path)
    } catch (error) {
        if (fallbackToPath) return path
        throw error
    }
}