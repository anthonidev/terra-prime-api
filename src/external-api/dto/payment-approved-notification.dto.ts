import { IsObject, IsOptional, IsString } from 'class-validator';

export class PaymentApprovedNotificationDto {
  @IsString()
  saleId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
