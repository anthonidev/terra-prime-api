import { Client } from '../entities/client.entity';
import { ClientListItem } from '../interfaces/client-list-item.interface';

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
  };

  return response;
};
