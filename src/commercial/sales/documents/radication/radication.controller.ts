import { Controller } from '@nestjs/common';

import { RadicationService } from './radication.service';

@Controller('radication')
export class RadicationController {
  constructor(private readonly radicationService: RadicationService) {}
}
