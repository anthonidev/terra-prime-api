export interface S3UploadResponse {
    url: string;
    key: string;
    bucket: string;
    location: string;
}

export interface S3DeleteResponse {
    success: boolean;
    message?: string;
}