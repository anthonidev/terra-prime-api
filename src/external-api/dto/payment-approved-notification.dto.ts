import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum PaymentNotificationAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class PaymentApprovedNotificationDto {
  @IsString()
  saleId: string;

  @IsString()
  saleStatus: string;

  @IsEnum(PaymentNotificationAction)
  action: PaymentNotificationAction;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
