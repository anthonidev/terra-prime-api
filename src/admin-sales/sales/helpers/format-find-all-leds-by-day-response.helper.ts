import { Lead } from 'src/lead/entities/lead.entity';

const getUbigeoFromLead = (lead: Lead) => {
  if (!lead.ubigeo) return null;

  const ubigeo = lead.ubigeo;

  // Si no tiene padre, es un departamento
  if (!ubigeo.parent && !ubigeo.parentId) {
    return {
      departamento: ubigeo.name,
      provincia: null,
      distrito: null,
    };
  }

  // Si tiene padre pero el padre no tiene padre, es una provincia
  if (ubigeo.parent && !ubigeo.parent.parent && !ubigeo.parent.parentId) {
    return {
      departamento: ubigeo.parent.name,
      provincia: ubigeo.name,
      distrito: null,
    };
  }

  // Si tiene padre y el padre tiene padre, es un distrito
  if (ubigeo.parent && ubigeo.parent.parent) {
    return {
      departamento: ubigeo.parent.parent.name,
      provincia: ubigeo.parent.name,
      distrito: ubigeo.name,
    };
  }

  // Fallback usando el código de ubigeo (formato peruano estándar)
  // - Departamentos: 2 dígitos (ej: "15")
  // - Provincias: 4 dígitos (ej: "1501")
  // - Distritos: 6 dígitos (ej: "150101")
  const codeLength = ubigeo.code?.length || 0;

  if (codeLength === 2) {
    return {
      departamento: ubigeo.name,
      provincia: null,
      distrito: null,
    };
  } else if (codeLength === 4) {
    return {
      departamento: ubigeo.parent?.name || null,
      provincia: ubigeo.name,
      distrito: null,
    };
  } else if (codeLength === 6) {
    return {
      departamento: ubigeo.parent?.parent?.name || ubigeo.parent?.name || null,
      provincia: ubigeo.parent?.name || null,
      distrito: ubigeo.name,
    };
  }

  // Último fallback
  return {
    departamento: ubigeo.parent?.name || ubigeo.name,
    provincia: ubigeo.parentId ? ubigeo.name : null,
    distrito: null,
  };
};

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
    source: lead.source
      ? {
          id: lead.source.id,
          name: lead.source.name,
        }
      : null,
    ubigeo: getUbigeoFromLead(lead),
    vendor: lead.vendor
      ? {
          id: lead.vendor.id,
          firstName: lead.vendor.firstName,
          lastName: lead.vendor.lastName,
          email: lead.vendor.email,
          document: lead.vendor.document,
        }
      : 'No asignado',
  };
};
