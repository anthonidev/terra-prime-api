import { SaleFileMetadata } from './sale-file-metadata.interface';

export interface SaleFileResponse {
  id: number;
  url: string;
  description?: string;
  metadata?: SaleFileMetadata;
  createdAt: Date;
}
