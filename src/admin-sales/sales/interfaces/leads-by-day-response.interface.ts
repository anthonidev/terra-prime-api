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
    id: number;
    name: string;
    code: string;
    parentId: number;
  } | null;
  vendor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    document: string;
  } | string;
}