export interface ICache {
    remember<T>(key: string, loader: () => Promise<T>): Promise<T>
}
