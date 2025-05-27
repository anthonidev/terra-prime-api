import { GuarantorResponse } from "src/admin-sales/guarantors/interfaces/guarantor-response.interface";
import { LeadsByDayResponse } from "src/admin-sales/sales/interfaces/leads-by-day-response.interface";

export interface ClientResponse {
  id: number;
  address: string;
  lead: LeadsByDayResponse;
  createdAt: Date;
}
