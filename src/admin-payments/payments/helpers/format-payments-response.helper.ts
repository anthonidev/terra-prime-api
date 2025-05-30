import { Payment } from "../entities/payment.entity";

export const formatPaymentsResponse = (payment: Payment) => {
  return {
    id: payment.id,
    relatedEntityType: payment.relatedEntityType,
    relatedEntityId: payment.relatedEntityId,
    amount: payment.amount,
    methodPayment: payment.methodPayment,
    status: payment.status,
    createdAt: payment.createdAt,
  }
};