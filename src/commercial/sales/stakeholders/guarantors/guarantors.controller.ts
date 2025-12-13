import { Controller } from '@nestjs/common';
import { GuarantorsService } from './guarantors.service';

@Controller('guarantors')
export class GuarantorsController {
  constructor(private readonly guarantorsService: GuarantorsService) {}
}
