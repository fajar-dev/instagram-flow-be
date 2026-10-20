export interface InstagramAccount {
    key: string
    label: string
    instagramUserId: string
    accessToken: string
    enabled: boolean
    tokenExpiresAt: string | null
}

export interface InstagramCredentials {
    graphVersion: string
    app: { appId: string; appSecret: string }
    accounts: InstagramAccount[]
}

export interface IInstagramCredentials {
    read(): Promise<InstagramCredentials>
}

export interface IInstagramApi {
    profile(key: string): Promise<{ id: string; username: string }>
    create(
        key: string,
        imageUrl: string,
        caption: string,
        placement: "feed" | "story"
    ): Promise<string>
    status(key: string, containerId: string): Promise<string>
    publish(key: string, containerId: string): Promise<string>
    permalink(key: string, mediaId: string): Promise<string | null>
}
