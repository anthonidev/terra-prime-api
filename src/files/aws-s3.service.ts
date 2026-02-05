// src/files/aws-s3.service.ts - Funciones adicionales para PDFs

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

            // Configurar el comando de subida (SIN ACL)
            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                // Removido: ACL: 'public-read', - Esta línea causa el error
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

    // NUEVA FUNCIÓN: Subir PDF desde Buffer
    async uploadPdfFromBuffer(
        pdfBuffer: Buffer,
        fileName: string,
        folder: string = 'documents'
    ): Promise<string> {
        try {
            const key = `${folder}/${fileName}`;

            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: pdfBuffer,
                ContentType: 'application/pdf',
                Metadata: {
                    generatedAt: new Date().toISOString(),
                },
            });

            await this.s3Client.send(uploadCommand);

            // Construir la URL pública
            const url = `https://${this.bucketName}.s3.${envs.awsRegion}.amazonaws.com/${key}`;

            this.logger.log(`PDF uploaded successfully: ${key}`);
            return url;
        } catch (error) {
            this.logger.error(`Error uploading PDF buffer: ${error.message}`, error.stack);
            throw new BadRequestException(`Error al subir el PDF: ${error.message}`);
        }
    }

    // NUEVA FUNCIÓN: Subir Excel desde Buffer
    async uploadExcelFromBuffer(
        excelBuffer: Buffer,
        fileName: string,
        folder: string = 'amendments'
    ): Promise<string> {
        try {
            const key = `${folder}/${fileName}`;

            const uploadCommand = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: excelBuffer,
                ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                Metadata: {
                    generatedAt: new Date().toISOString(),
                },
            });

            await this.s3Client.send(uploadCommand);

            // Construir la URL pública
            const url = `https://${this.bucketName}.s3.${envs.awsRegion}.amazonaws.com/${key}`;

            this.logger.log(`Excel uploaded successfully: ${key}`);
            return url;
        } catch (error) {
            this.logger.error(`Error uploading Excel buffer: ${error.message}`, error.stack);
            throw new BadRequestException(`Error al subir el Excel: ${error.message}`);
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

    // NUEVA FUNCIÓN: Eliminar archivo por URL completa
    async deleteFileByUrl(fileUrl: string): Promise<S3DeleteResponse> {
        try {
            // Extraer la key del URL
            const url = new URL(fileUrl);
            const key = url.pathname.substring(1); // Remover el primer '/'

            return await this.deleteFile(key);
        } catch (error) {
            this.logger.error(`Error deleting file by URL: ${error.message}`, error.stack);
            return {
                success: false,
                message: `Error al eliminar el archivo por URL: ${error.message}`,
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

    async uploadFileAnyType(
        file: Express.Multer.File,
        folder: string = 'uploads',
    ): Promise<S3UploadResponse> {
        try {
            // Solo validar que el archivo exista y el tamaño
            if (!file) {
                throw new BadRequestException('No se proporcionó ningún archivo');
            }

            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new BadRequestException('El archivo es demasiado grande. Máximo 10MB');
            }

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

    // FUNCIÓN ACTUALIZADA: Verificar si un archivo existe (con mejor manejo de errores)
    async fileExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            // Para otros errores, los registramos pero asumimos que el archivo no existe
            this.logger.warn(`Error checking file existence for ${key}: ${error.message}`);
            return false;
        }
    }

    // NUEVA FUNCIÓN: Verificar si un archivo existe por URL completa
    async fileExistsByUrl(fileUrl: string): Promise<boolean> {
        try {
            const url = new URL(fileUrl);
            const key = url.pathname.substring(1); // Remover el primer '/'
            return await this.fileExists(key);
        } catch (error) {
            this.logger.warn(`Error checking file existence by URL ${fileUrl}: ${error.message}`);
            return false;
        }
    }
}