import { Lead } from "src/lead/entities/lead.entity";
import { LeadVisit } from "src/lead/entities/lead-visit.entity";

export interface LeadReportDocumentResponse {
  leadId: string;
  documentUrl: string;
  generatedAt: Date;
  clientName: string;
  documentNumber: string;
  leadInfo: {
    documentType: string;
    phone: string;
    source: string;
  };
}

export interface LeadReportGenerationResponse extends LeadReportDocumentResponse {
  isNewDocument: boolean;
}

// Interface para los datos del PDF del reporte de leads
export interface LeadReportPdfData {
  lead: Lead;
  leadVisit: LeadVisit;
  additionalInfo?: {
    // Información adicional si es necesaria
    departmentName?: string;
    provinceName?: string;
    districtName?: string;
  };
}