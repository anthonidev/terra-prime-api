import { MethodPayment } from "../enums/method-payment.enum";
import { StatusPayment } from "../enums/status-payments.enum";

export interface PaymentResponse {
  id: number;
  relatedEntityType: string;
  relatedEntityId: string;
  amount: number;
  methodPayment: MethodPayment;
  status: StatusPayment;
  createdAt: Date;
  vouchers: {
    id: number;
    url: string;
    amount: number;
    bankName: string;
    transactionReference: string;
    transactionDate: Date;
  }[];
}