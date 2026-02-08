import { SaleFileMetadata } from '../interfaces/sale-file-metadata.interface';
import * as path from 'path';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const extractFileMetadata = (
  file: Express.Multer.File,
): SaleFileMetadata => {
  const extension = path.extname(file.originalname).toLowerCase();

  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    extension,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    encoding: file.encoding,
  };
};
