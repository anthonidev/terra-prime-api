import { SaleFile } from '../entities/sale-file.entity';
import { SaleFileResponse } from '../interfaces/sale-file-response.interface';

export const formatSaleFileResponse = (saleFile: SaleFile): SaleFileResponse => {
  return {
    id: saleFile.id,
    url: saleFile.url,
    description: saleFile.description,
    createdAt: saleFile.createdAt,
  };
};

export const formatSaleFilesResponse = (saleFiles: SaleFile[]): SaleFileResponse[] => {
  return saleFiles.map(formatSaleFileResponse);
};
