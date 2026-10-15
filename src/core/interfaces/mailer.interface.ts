export interface IMailer {
    sendHtml(to: string, subject: string, html: string, text?: string): Promise<unknown>
}
