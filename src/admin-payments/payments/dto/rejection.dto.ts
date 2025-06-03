import { IsNotEmpty, IsString } from "class-validator";

export class RejectionDto {
  @IsString({ message: 'Se requiere una razón para rechazar el pago' })
  @IsNotEmpty({ message: 'Se requiere una razón para rechazar el pago' })
  rejectionReason: string;
}