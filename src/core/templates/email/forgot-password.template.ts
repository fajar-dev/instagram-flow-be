/**
 * Helper to escape HTML characters and prevent injection
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

export interface ForgotPasswordEmailProps {
    name: string
    resetLink: string
    expiresInHours?: number
}

/**
 * Generates simple, clean HTML and plain text for Forgot Password email in English.
 */
export function renderForgotPasswordEmail(props: ForgotPasswordEmailProps): {
    html: string
    text: string
} {
    const safeName = escapeHtml(props.name || "User")
    const safeResetLink = escapeHtml(props.resetLink)
    const expiresInHours = props.expiresInHours ?? 10
    const currentYear = new Date().getFullYear()
    const copyrightText = `© ${currentYear} Asset Monitoring Teknologi Indonesia`

    // Plain text fallback
    const text = [
        `Hello ${props.name || "User"},`,
        "",
        `We received a request to reset your password.`,
        "",
        `Please use the following link to reset your password:`,
        props.resetLink,
        "",
        `This link is valid for ${expiresInHours} hours.`,
        "",
        `If you did not request a password reset, you can safely ignore this email.`,
        "",
        `Thank you,`,
        copyrightText
    ].join("\n")

    // Simple, clean HTML email
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px 28px;">
                    <tr>
                        <td>
                            <p style="margin: 0 0 16px 0; font-size: 15px;">
                                Hello <strong>${safeName}</strong>,
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151;">
                                We received a request to reset your password. Click the button below to proceed:
                            </p>

                            <div style="margin: 28px 0; text-align: center;">
                                <a href="${safeResetLink}" target="_blank" style="display: inline-block; background-color: #2D4E6F; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                                    Reset Password
                                </a>
                            </div>

                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">
                                This link is valid for <strong>${expiresInHours} hours</strong>. If you did not request a password reset, you can safely ignore this email.
                            </p>

                            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />

                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #9ca3af;">
                                If the button above does not work, copy and paste the following link into your web browser:
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 12px; word-break: break-all;">
                                <a href="${safeResetLink}" target="_blank" style="color: #2D4E6F;">${safeResetLink}</a>
                            </p>

                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                &copy; ${currentYear} Asset Monitoring Teknologi Indonesia
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

    return { html, text }
}
