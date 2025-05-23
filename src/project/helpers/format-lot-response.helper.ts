import { Lot } from '../entities/lot.entity';
export const formatLotResponse = (lot: Lot): any => {
  return {
    id: lot.id,
    name: lot.name,
    area: lot.area,
    lotPrice: lot.lotPrice,
    urbanizationPrice: lot.urbanizationPrice,
    totalPrice: lot.totalPrice,
    status: lot.status,
    createdAt: lot.createdAt,
  };
};