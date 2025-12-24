export interface ClientListItem {
  id: number;
  address: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  documentType: string;
  ubigeo: {
    departamento: string;
    provincia: string | null;
    distrito: string | null;
  } | null;
}
