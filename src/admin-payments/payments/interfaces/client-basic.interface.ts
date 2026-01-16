import { LeadBasic } from "./lead-basic.interface";

export interface ClientBasic {
  address?: string;
  documentType?: string;
  email?: string;
  lead?: LeadBasic;
}