export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{
    excelCode: string;
    error: string;
    stack?: string;
  }>;
  salesCreated: Array<{
    excelCode: string;
    saleId: string;
    lotName: string;
    clientDocument: string;
  }>;
}
