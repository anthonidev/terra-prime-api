// Interfaces de componentes
interface FormattedCompanion {
  fullName: string;
  dni?: string;
  relationship?: string;
}

interface FormattedParticipant {
  firstName: string;
  lastName: string;
}

interface FormattedSource {
  id: number;
  name: string;
  isActive: boolean;
}

interface FormattedUbigeo {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
}

interface FormattedVendor {
  document: string;
  firstName: string;
  lastName: string;
}

interface FormattedVisit {
  id: string;
  arrivalTime: Date;
  departureTime: Date | null;
  observations: string | null;
}

// Interface para formatLeadWithParticipants
export interface LeadWithParticipantsResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  document: string;
  documentType: string;
  phone?: string | null;
  phone2?: string | null;
  age?: number | null;
  isActive: boolean;
  isInOffice: boolean;
  interestProjects?: string[];
  companions?: FormattedCompanion[];
  metadata?: Record<string, any>;
  reportPdfUrl?: string | null;
  visits: FormattedVisit[];
  source: FormattedSource | null;
  ubigeo: FormattedUbigeo | null;
  vendor?: FormattedVendor | null;
  liner: FormattedParticipant | null;
  telemarketingSupervisor: FormattedParticipant | null;
  telemarketingConfirmer: FormattedParticipant | null;
  telemarketer: FormattedParticipant | null;
  fieldManager: FormattedParticipant | null;
  fieldSupervisor: FormattedParticipant | null;
  fieldSeller: FormattedParticipant | null;
}

// Interface para formatLeadSummary
export interface LeadSummaryResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  document: string;
  documentType: string;
  phone?: string | null;
  phone2?: string | null;
  age?: number | null;
  isActive: boolean;
  isInOffice: boolean;
  reportPdfUrl?: string | null;
  source: FormattedSource | null;
  ubigeo: FormattedUbigeo | null;
  vendor: FormattedVendor | null;
}
