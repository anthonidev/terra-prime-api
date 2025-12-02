export interface LeadsByDayResponse {
  id: string;
  firstName: string;
  lastName: string;
  document: string;
  documentType: string;
  phone: string;
  phone2: string;
  age: number;
  createdAt: Date;
  source: {
    id: number;
    name: string;
  } | null;
  ubigeo: {
    departamento: string;
    provincia: string | null;
    distrito: string | null;
  } | null;
  vendor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    document: string;
  } | string;
}