import { Lead } from "../entities/lead.entity";

export const formatLeadResponse = (lead: Lead) => {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    document: lead.document,
    documentType: lead.documentType,
    isInOffice: lead.isInOffice,
    phone: lead.phone,
    phone2: lead.phone2,
    email: lead.email,
    age: lead.age,
    source: {
      id: lead.source?.id,
      name: lead.source?.name,
    },
    ubigeo: {
      id: lead.ubigeo?.id,
      name: lead.ubigeo?.name,
    },
    createdAt: lead.createdAt,
  };
};