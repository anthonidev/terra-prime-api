import { Client } from "../entities/client.entity";

export const formatClientResponseSale = (client: Client) => {
  return {
    id: client.id,
    address: client.address,
  };
};
