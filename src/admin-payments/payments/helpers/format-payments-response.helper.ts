import { Payment } from "../entities/payment.entity";

export const formatPaymentsResponse = (payment: Payment) => {
  return {
    id: payment.id,
    relatedEntityType: payment.relatedEntityType,
    relatedEntityId: payment.relatedEntityId,
    amount: payment.amount,
    methodPayment: payment.methodPayment,
    numberTicker: payment.numberTicket,
    codeOperation: payment.codeOperation,
    rejectionReason: payment.rejectionReason ? payment.rejectionReason : null,
    status: payment.status,
    createdAt: payment.createdAt,
  }
};