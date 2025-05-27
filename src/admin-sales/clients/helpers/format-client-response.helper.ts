import { formatLeadResponse } from "src/lead/helpers/format-lead-response.helper";
import { Client } from "../entities/client.entity";
import { formatGuarantorResponse } from "src/admin-sales/guarantors/helpers/format-guarantor-response";
import { formatFindAllLedsByDayResponse } from "src/admin-sales/sales/helpers/format-find-all-leds-by-day-response.helper";

export const formatClientResponse = (client: Client) => {
  return {
    id: client.id,
    address: client.address,
    lead: formatFindAllLedsByDayResponse(client.lead),
    createdAt: client.createdAt,
  };
};