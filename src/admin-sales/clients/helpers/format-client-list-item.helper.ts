import { Client } from '../entities/client.entity';
import { ClientListItem } from '../interfaces/client-list-item.interface';

const getUbigeoFromLead = (lead: Client['lead']) => {
  if (!lead?.ubigeo) return null;

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

export const formatClientListItem = (client: Client): ClientListItem => {
  if (!client) return null;

  const response: ClientListItem = {
    id: client.id,
    address: client.address,
    isActive: client.isActive,
    firstName: client.lead?.firstName,
    lastName: client.lead?.lastName,
    email: client.lead?.email,
    phone: client.lead?.phone,
    document: client.lead?.document,
    documentType: client.lead?.documentType,
    ubigeo: getUbigeoFromLead(client.lead),
  };

  return response;
};
