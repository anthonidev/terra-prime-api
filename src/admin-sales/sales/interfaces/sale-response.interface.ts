export interface SaleResponse {
  id: string;
  type: string;
  totalAmount: number;
  contractDate: string;
  saleDate: string;
  status: string;
  client: {
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  lot: {
    id: string;
    name: string;
    lotPrice: number;
  };
  financing: {
    id: string;
    initialAmount: number;
    interestRate: number;
    quantityCoutes: number;
  };
  guarantor: {
    firstName: string;
    lastName: string;
  };
  reservation: {
    id: string;
    amount: number;
  };
  vendor: {
    document: string;
    firstName: string;
    lastName: string;
  };
}