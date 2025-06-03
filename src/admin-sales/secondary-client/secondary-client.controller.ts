import { Controller } from '@nestjs/common';
import { SecondaryClientService } from './secondary-client.service';

@Controller('secondary-client')
export class SecondaryClientController {
  constructor(private readonly secondaryClientService: SecondaryClientService) {}
}
