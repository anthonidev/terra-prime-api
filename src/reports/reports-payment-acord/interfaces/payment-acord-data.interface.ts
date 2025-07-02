import { Sale } from "src/admin-sales/sales/entities/sale.entity";

export interface PaymentAcordReportDocumentResponse {
  saleId: string;
  documentUrl: string;
  generatedAt: Date;
  clientName: string;
  lotName: string;
  saleInfo: {
    type: string;
    totalAmount: number;
    projectName: string;
  };
}

export interface PaymentAcordReportGenerationResponse extends PaymentAcordReportDocumentResponse {
  isNewDocument: boolean;
}

// Interface para los datos del PDF del acuerdo de pago
export interface PaymentAcordReportPdfData {
  sale: Sale;
  additionalInfo?: {
    // Información adicional si es necesaria
    currentDate?: string;
  };
}