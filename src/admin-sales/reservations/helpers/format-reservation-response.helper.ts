import { Reservation } from "../entities/reservation.entity";
import { ReservationResponse } from "../interfaces/reservation-response.interface";

export const formatReservationResponse = (
  reservation: Reservation
): ReservationResponse => {
  return {
    id: reservation.id,
    amount: reservation.amount,
    status: reservation.status,
    client: {
      address: reservation.client.address,
      firstName: reservation.client.lead.firstName,
      lastName: reservation.client.lead.lastName,
      phone: reservation.client.lead.phone,
    },
    lot: {
      id: reservation.lot.id,
      name: reservation.lot.name,
      lotPrice: reservation.lot.lotPrice,
    },
    vendor: {
      document: reservation.vendor.document,
      firstName: reservation.vendor.firstName,
      lastName: reservation.vendor.lastName,
    },
  };
};