import { ClientResponse } from "src/admin-sales/clients/interfaces/client-response.interface";
import { GuarantorResponse } from "src/admin-sales/guarantors/interfaces/guarantor-response.interface";

export const formatClientAndGuarantorResponse = (client: ClientResponse, guarantor: GuarantorResponse, secondaryClientIds: number[]) => {
  return {
    clientId: client.id,
    guarantorId: guarantor?.id || null,
    secondaryClientIds,
  };
};