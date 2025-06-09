import { BadRequestException } from "@nestjs/common";

export const validateSaleDates = ({
  firstPaymentDateHu,
}) => {

  const normalizeDate = (dateString: string | Date): number => {
    const d = new Date(dateString);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  };

  const todayNormalized = normalizeDate(new Date());
  const firstHuNormalized = normalizeDate(firstPaymentDateHu);

  // Ahora las comparaciones son numéricas y correctas
  if (firstHuNormalized < todayNormalized)
    throw new BadRequestException('La fecha de pago inicial de la habilitación urbana no puede ser anterior a la fecha de venta');
};