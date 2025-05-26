import { CreateDetailPaymentDto } from "src/admin-payments/payments/dto/create-detail-payment.dto";
import { MethodPayment } from "src/admin-payments/payments/enums/method-payment.enum";

export class DirectPaymentSaleDto {
  lotId: string;
  clientId: number;
  qantityHuCuotes: number;
  paymentDate: string;
  saleDate: string;
  contractDate: string;
  reservationId?: string;
  methodPayment: MethodPayment;
  totalAmount: number;
  payments?: CreateDetailPaymentDto[];
}