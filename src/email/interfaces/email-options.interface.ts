export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    from?: string;
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
    cid?: string;
}

export interface EmailResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}