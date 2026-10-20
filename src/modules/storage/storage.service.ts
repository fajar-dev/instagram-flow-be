export interface IStorage {
    upload(objectName: string, buffer: Buffer, contentType: string): Promise<string>
}

export class StorageService {
    constructor(private readonly storage: IStorage) {}

    async upload(file: File) {
        const { preview } = await readUploadImage(file, config.media.maxUploadMb)
        const objectName = `users/${crypto.randomUUID()}.jpg`
        await this.storage.upload(objectName, preview, "image/jpeg")
        return { path: objectName }
    }
}
import { config } from "../../config/config"
import { readUploadImage } from "../../core/helpers/upload-image"
