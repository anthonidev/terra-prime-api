import { User } from "src/user/entities/user.entity";
import { MethodPayment } from "../enums/method-payment.enum";
import { StatusPayment } from "../enums/status-payments.enum";
import { ClientBasic } from "./client-basic.interface";
import { LotBasic } from "./lot-basic.interface";
import { UserBasic } from "./user-basic.interface";
import { CurrencyType } from "src/project/entities/project.entity";
import { ReviewByBasic } from "./review-by-basic.interface";

export interface PaymentAllResponse {
  id: number;
  amount: number;
  status: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewBy?: ReviewByBasic | null;
  banckName?: string;
  dateOperation?: Date;
  numberTicket?: string;
  paymentConfig: string;
  reason?: string | null;
  user: UserBasic;
  currency?: CurrencyType;
  client?: ClientBasic;
  lot?: LotBasic;
  vouchers?: {
    id: number;
    url: string;
    amount: number;
    bankName: string;
    transactionReference: string;
    codeOperation?: string;
    transactionDate: Date;
    isActive: boolean;
  }[];
}