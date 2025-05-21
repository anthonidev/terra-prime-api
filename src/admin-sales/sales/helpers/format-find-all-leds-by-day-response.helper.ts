import { Lead } from "src/lead/entities/lead.entity";

export const formatFindAllLedsByDayResponse = (lead: Lead) => {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    document: lead.document,
    documentType: lead.documentType,
    phone: lead.phone,
    phone2: lead.phone2,
    age: lead.age,
    createdAt: lead.createdAt,
    source: {
      id: lead.source.id,
      name: lead.source.name,
    },
    ubigeo: {
      id: lead.ubigeo.id,
      name: lead.ubigeo.name,
      code: lead.ubigeo.code,
      parentId: lead.ubigeo.parentId,
    },
    vendor: lead.vendor ? {
      id: lead.vendor.id,
      firstName: lead.vendor.firstName,
      lastName: lead.vendor.lastName,
      email: lead.vendor.email,
      document: lead.vendor.document,
    }: 'No asignado',
  };
};