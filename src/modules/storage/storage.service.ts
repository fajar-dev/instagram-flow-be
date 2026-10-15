import { BadRequestException } from "../../core/exceptions/base"

export interface IStorage {
    upload(objectName: string, buffer: Buffer, contentType: string): Promise<string>
    proxyHandler(objectName: string): Promise<Response>
}

export class StorageService {
    constructor(private readonly storage: IStorage) {}

    async upload(file: File) {
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
        const objectName = `users/${crypto.randomUUID()}.${extension}`
        await this.storage.upload(objectName, Buffer.from(await file.arrayBuffer()), file.type)
        return { path: objectName }
    }

    proxy(path?: string) {
        if (!path) throw new BadRequestException("Missing 'path' query parameter")
        return this.storage.proxyHandler(path)
    }
}
