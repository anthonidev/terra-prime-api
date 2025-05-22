import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envs } from '../config/envs';
import { S3UploadResponse, S3DeleteResponse } from './interfaces/s3-response.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsS3Service {
    private readonly logger = new Logger(AwsS3Service.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;

    constructor() {
        this.s3Client = new S3Client({
            region: envs.awsRegion,
            credentials: {
                accessKeyId: envs.awsAccessKeyId,
                secretAccessKey: envs.awsSecretAccessKey,
            },
        });
        this.bucketName = envs.awsS3BucketName;
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'uploads',
    ): Promise<S3UploadResponse> {
        try {
            // Validar el archivo
            this.validateFile(file);

            // Generar nombre único para el archivo
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${uuidv4()}.${fileExtension}`;
            const key = `${folder}/${fileName}`;

            // Configurar el comando de subida
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read', // Hacer el archivo público
                Metadata: {
                    originalName: file.originalname,
                    uploadedAt: new Date().toISOString(),
                },
            });

            // Subir el archivo
            await this.s3Client.send(uploadCommand);

            // Construir la URL pública
            const url = `https://${this.bucketName}.s3.${envs.awsRegion}.amazonaws.com/${key}`;

            this.logger.log(`File uploaded successfully: ${key}`);

            return {
                url,
                key,
                bucket: this.bucketName,
                location: url,
            };
        } catch (error) {
            this.logger.error(`Error uploading file: ${error.message}`, error.stack);
            throw new BadRequestException(`Error al subir el archivo: ${error.message}`);
        }
    }

    async deleteFile(key: string): Promise<S3DeleteResponse> {
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(deleteCommand);

            this.logger.log(`File deleted successfully: ${key}`);

            return {
                success: true,
                message: 'Archivo eliminado correctamente',
            };
        } catch (error) {
            this.logger.error(`Error deleting file: ${error.message}`, error.stack);
            return {
                success: false,
                message: `Error al eliminar el archivo: ${error.message}`,
            };
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            return signedUrl;
        } catch (error) {
            this.logger.error(`Error generating signed URL: ${error.message}`, error.stack);
            throw new BadRequestException('Error al generar URL firmada');
        }
    }

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'images',
    ): Promise<S3UploadResponse> {
        // Validar que sea una imagen
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('El archivo debe ser una imagen');
        }

        return this.uploadFile(file, folder);
    }

    private validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No se proporcionó ningún archivo');
        }

        // Validar tamaño del archivo (máximo 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new BadRequestException('El archivo es demasiado grande. Máximo 10MB');
        }

        // Validar tipos de archivo permitidos
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Tipo de archivo no permitido');
        }
    }

    // Método para obtener información del bucket
    async getBucketInfo(): Promise<{ bucket: string; region: string }> {
        return {
            bucket: this.bucketName,
            region: envs.awsRegion,
        };
    }

    // Método para verificar si un archivo existe
    async fileExists(key: string): Promise<boolean> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }
}