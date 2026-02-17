import { Parking } from '../entities/parking.entity';
import { CreateParkingResponseDto } from '../dto/create-parking.dto';

export const formatParkingResponse = (
  parking: Parking,
): CreateParkingResponseDto => {
  return {
    id: parking.id,
    name: parking.name,
    area: parking.area,
    price: parking.price,
    status: parking.status,
    currency: parking.currency,
    projectId: parking.project.id,
    projectName: parking.project.name,
    createdAt: parking.createdAt,
    updatedAt: parking.updatedAt,
  };
};
