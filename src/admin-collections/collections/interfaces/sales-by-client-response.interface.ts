export interface SalesByClientResponse {
  client: {
    id: number;
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
    document: string;
    documentType: string;
    age: number;
    ubigeo: {
      departamento: string;
      provincia: string | null;
      distrito: string | null;
    } | null;
    reportPdfUrl: string | null;
  };
  items: {
    id: string;
    type: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    currency: string;
    lot: {
      id: string;
      name: string;
      block: string;
      stage: string;
      project: string;
    };
    radicationPdfUrl: string | null;
    paymentAcordPdfUrl: string | null;
    financing: {
      id: string;
      initialAmount: string;
      interestRate: string;
      quantityCoutes: string;
    } | null;
    vendor: {
      document: string;
      firstName: string;
      lastName: string;
    };
  }[];
}
