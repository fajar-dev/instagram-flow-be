import * as Minio from "minio"
import { config } from "../../config/config"
import { Readable } from "node:stream"
import { logger } from "./logger"
import { InternalServerException } from "../exceptions/base"

const minioClient = new Minio.Client({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey
})

const BUCKET = config.minio.bucket

class MinioHelper {
    /** All application objects use private storage; clients receive signed URLs. */
    async ensurePrivateBucket(bucket: string) {
        await this.ensureBucket(bucket)
        let policy = ""
        try {
            policy = await minioClient.getBucketPolicy(bucket)
        } catch (error) {
            if ((error as { code?: string }).code !== "NoSuchBucketPolicy") {
                throw error
            }
        }
        // Bucket policies grant anonymous access in MinIO. Private buckets need no policy.
        if (policy.trim()) {
            throw new InternalServerException("Storage bucket must not have a public policy")
        }
    }

    /**
     * Ensure the default bucket exists, create it if not
     */
    async ensureBucket(bucket: string = BUCKET) {
        const exists = await minioClient.bucketExists(bucket)
        if (!exists) {
            try {
                await minioClient.makeBucket(bucket)
            } catch (error) {
                if (
                    !["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(
                        (error as { code?: string }).code || ""
                    )
                ) {
                    throw error
                }
            }
            logger.info("MinIO bucket created", { bucket })
        }
    }

    /**
     * Upload a file buffer to MinIO
     * @param objectName - The object key / path in the bucket (e.g. "avatars/user-1.png")
     * @param buffer - The file buffer
     * @param contentType - MIME type (e.g. "image/png")
     * @param bucket - Optional bucket override
     * @returns The object name that was uploaded
     */
    async upload(
        objectName: string,
        buffer: Buffer,
        contentType: string,
        bucket: string = BUCKET
    ): Promise<string> {
        await this.ensureBucket(bucket)

        await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
            "Content-Type": contentType
        })

        logger.info("MinIO object uploaded", {
            bucket,
            objectName,
            contentType,
            size: buffer.length
        })
        return objectName
    }

    /**
     * Get a presigned URL for downloading/viewing an object
     * @param objectName - The object key in the bucket
     * @param expiry - Expiry in seconds (default: 7 days)
     * @param bucket - Optional bucket override
     */
    async getPresignedUrl(
        objectName: string,
        expiry: number = 7 * 24 * 60 * 60,
        bucket: string = BUCKET
    ): Promise<string> {
        return minioClient.presignedGetObject(bucket, objectName, expiry)
    }

    /**
     * Get an object as a readable stream with its metadata
     * @param objectName - The object key in the bucket
     * @param bucket - Optional bucket override
     */
    async getObject(
        objectName: string,
        bucket: string = BUCKET
    ): Promise<{ stream: Readable; stat: Minio.BucketItemStat }> {
        const stat = await minioClient.statObject(bucket, objectName)
        const stream = await minioClient.getObject(bucket, objectName)
        return { stream, stat }
    }

    /**
     * Delete an object from MinIO
     * @param objectName - The object key in the bucket
     * @param bucket - Optional bucket override
     */
    async delete(objectName: string, bucket: string = BUCKET): Promise<void> {
        await minioClient.removeObject(bucket, objectName)
        logger.info("MinIO object deleted", { bucket, objectName })
    }

    /**
     * Check if an object exists in the bucket
     * @param objectName - The object key in the bucket
     * @param bucket - Optional bucket override
     */
    async exists(objectName: string, bucket: string = BUCKET): Promise<boolean> {
        try {
            await minioClient.statObject(bucket, objectName)
            return true
        } catch {
            return false
        }
    }

    /**
     * Extracts the relative path of an object from a full URL, or returns it as-is if already relative.
     * Robust against nested, double-encoded URLs.
     */
    sanitizePath(urlOrPath: string | null | undefined, bucket: string = BUCKET): string | null {
        if (!urlOrPath) {
            return null
        }

        let decoded = urlOrPath
        try {
            // Recursively decode URL-encoded segments if nested
            while (decoded && decoded.includes("%")) {
                const next = decodeURIComponent(decoded)
                if (next === decoded) {
                    break
                }
                decoded = next
            }
        } catch {
            // Ignore decoding errors
        }

        // If the URL contains the bucket name, extract everything after the last occurrence of the bucket name
        const marker = `/${bucket}/`
        if (decoded.includes(marker)) {
            const parts = decoded.split(marker)
            decoded = parts[parts.length - 1]
        }

        // Strip query parameters
        if (decoded.includes("?")) {
            decoded = decoded.split("?")[0]
        }

        // Clean up leading/trailing slashes
        decoded = decoded.replace(/^\/+|\/+$/g, "")

        return decoded || null
    }
}

// Export a singleton instance
export const minio = new MinioHelper()

export default minio
