import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { SaleResponse } from "src/admin-sales/sales/interfaces/sale-response.interface";
import { UrbanDevelopment } from "src/admin-sales/urban-development/entities/urban-development.entity";

export interface SaleDetailCollectionResponse {
  sale: SaleResponse;
  urbanDevelopment: UrbanDevelopment | null;
}