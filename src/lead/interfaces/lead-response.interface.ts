export interface LeadResponse {
  id: string;
  firstName: string;
  lastName: string;
  document: string;
  documentType: string;
  isInOffice: boolean;
  phone: string;
  phone2: string;
  email: string;
  age: number;
  source: {
    id: string;
    name: string;
  };
  ubigeo: {
    id: string; 
    name: string;
  };
  createdAt: Date;
}