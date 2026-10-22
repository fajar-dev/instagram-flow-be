import sharp from "sharp"
import { contentMedia } from "../modules/content/content.module"
import { logger } from "../core/helpers/logger"

/** Provision approved brand references in the existing private bucket. */
export async function uploadDesignReferences(
    referencePath: string,
    logoPath: string,
    partnerPath: string
) {
    const files = await Promise.all(
        [referencePath, logoPath, partnerPath].map(async (path, index) => {
            const file = Bun.file(path)
            if (!(await file.exists()) || file.size > 8 * 1024 * 1024) {
                throw new Error("Brand reference must be an existing image up to 8 MiB")
            }
            const bytes = Buffer.from(await file.arrayBuffer())
            const metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata()
            if (metadata.format !== (index === 2 ? "jpeg" : "png") || (metadata.pages || 1) !== 1) {
                throw new Error(
                    "Reference and AMTI logo must be static PNG; partner logo must be static JPEG"
                )
            }
            return bytes
        })
    )
    await contentMedia.put("brand/design-reference.png", files[0]!)
    await contentMedia.put("brand/logo.png", files[1]!)
    await contentMedia.put("brand/partner-logo.jpeg", files[2]!)
}

if (import.meta.main) {
    const [reference, logo, partner] = process.argv.slice(2)
    if (!reference || !logo || !partner) {
        logger.error(
            "Usage: bun run brand:upload <design-reference.png> <amti-logo.png> <partner-logo.jpeg>"
        )
        process.exitCode = 1
    } else {
        try {
            await uploadDesignReferences(reference, logo, partner)
            logger.info("AMTI design reference and both logos uploaded")
        } catch {
            logger.error(
                "Failed to upload AMTI design references; verify reference/logo files and storage"
            )
            process.exitCode = 1
        }
    }
}
