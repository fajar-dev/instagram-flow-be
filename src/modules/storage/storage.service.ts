export interface IStorage {
    upload(objectName: string, buffer: Buffer, contentType: string): Promise<string>
}

export class StorageService {
    constructor(private readonly storage: IStorage) {}

    async upload(file: File) {
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
        const objectName = `users/${crypto.randomUUID()}.${extension}`
        await this.storage.upload(objectName, Buffer.from(await file.arrayBuffer()), file.type)
        return { path: objectName }
    }

}
