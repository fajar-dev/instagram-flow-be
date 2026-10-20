export interface IContentMedia {
    signedUrl(key: string, expiry: number): Promise<string>
    put(key: string, data: Buffer): Promise<void>
    get(key: string): Promise<Buffer>
    remove(key: string): Promise<void>
}
