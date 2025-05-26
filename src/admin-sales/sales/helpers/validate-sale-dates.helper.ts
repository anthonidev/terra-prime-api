import { BadRequestException } from "@nestjs/common";

export const validateSaleDates = ({
  saleDate,
  paymentDate,
  firstPaymentDateHu,
}) => {

  const normalizeDate = (dateString: string | Date): number => {
    const d = new Date(dateString);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  };

  const todayNormalized = normalizeDate(new Date());
  const saleNormalized = normalizeDate(saleDate);
  const paymentNormalized = normalizeDate(paymentDate);
  const firstHuNormalized = normalizeDate(firstPaymentDateHu);

  // Ahora las comparaciones son numéricas y correctas
  if (saleNormalized < todayNormalized)
    throw new BadRequestException('La fecha de venta no puede ser anterior a la fecha actual');

  if (paymentNormalized < saleNormalized)
    throw new BadRequestException('La fecha de pago no puede ser anterior a la fecha de venta');

  if (firstHuNormalized < saleNormalized)
    throw new BadRequestException('La fecha de pago inicial de la habilitación urbana no puede ser anterior a la fecha de venta');
};