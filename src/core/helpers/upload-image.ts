import sharp from "sharp"
import { BadRequestException } from "../exceptions/base"

/** Decode and validate actual bytes before any image reaches persistent storage. */
export async function readUploadImage(file: File, maxMb: number) {
    if (!file.size || file.size > maxMb * 1024 * 1024) {
        throw new BadRequestException("Invalid file size")
    }
    const original = Buffer.from(await file.arrayBuffer())
    try {
        const metadata = await sharp(original, { limitInputPixels: false }).metadata()
        if ((metadata.width || 0) * (metadata.height || 0) > 40000000) {
            throw new BadRequestException("Image resolution exceeds 40 megapixels")
        }
        const formats: Record<string, { mime: string; extensions: string[] }> = {
            jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
            png: { mime: "image/png", extensions: ["png"] },
            webp: { mime: "image/webp", extensions: ["webp"] }
        }
        const format = formats[metadata.format || ""]
        if (
            !format ||
            file.type !== format.mime ||
            !format.extensions.includes(file.name.split(".").pop()?.toLowerCase() || "") ||
            (metadata.pages || 1) > 1
        ) {
            throw new BadRequestException("Only static JPG, PNG and WEBP images are supported")
        }
        // Force decoding to catch truncated images before storage.
        const preview = await sharp(original, { limitInputPixels: 40000000, failOn: "warning" })
            .rotate()
            .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toBuffer()
        return { original, metadata, preview }
    } catch (error) {
        if (error instanceof BadRequestException) {
            throw error
        }
        throw new BadRequestException("Invalid or unsupported image")
    }
}
