import { ClientResponse } from "src/admin-sales/clients/interfaces/client-response.interface";

export interface ClientCollectionResponse extends ClientResponse {
  hasActiveLatePayment: boolean;
}
