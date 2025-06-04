import { StatusReservation } from "../enums/status-reservation.enum";

export interface ReservationResponse {
  id: string;
  amount: number;
  status: StatusReservation;
  client: {
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  lot: {
    id: string;
    name: string;
    lotPrice: number;
  };
  vendor: {
    document: string;
    firstName: string;
    lastName: string;
  };
}