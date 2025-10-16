import { Injectable, Logger } from '@nestjs/common';
import { ApiFetchAdapter } from 'src/common/adapters/api-fetch.adapter';
import { ApiResponse } from 'src/common/interfaces/api-response.interface';
import { envs } from 'src/config/envs';
import { PaymentApprovedNotificationDto } from './dto/payment-approved-notification.dto';

@Injectable()
export class NexusApiService {
  private readonly logger = new Logger(NexusApiService.name);
  private readonly nexusBaseUrl = envs.nexusUnilevelApiUrl;
  private readonly nexusApiKey = envs.nexusUnilevelApiKey;

  constructor(private readonly httpAdapter: ApiFetchAdapter) {}

  async notifyPaymentApproved(
    notificationDto: PaymentApprovedNotificationDto,
  ): Promise<ApiResponse> {
    try {
      this.logger.log(
        `Notificando a Nexus sobre aprobación de pago para venta: ${notificationDto.saleId}`,
      );

      const url = `${this.nexusBaseUrl}/api/unilevel/external/approved`;

      const response = await this.httpAdapter.post<ApiResponse>(
        url,
        notificationDto,
        this.nexusApiKey,
      );

      this.logger.log(
        `Nexus notificado exitosamente para venta: ${notificationDto.saleId}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error al notificar a Nexus para venta ${notificationDto.saleId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
