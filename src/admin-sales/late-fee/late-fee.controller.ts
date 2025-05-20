import { Controller } from '@nestjs/common';
import { LateFeeService } from './late-fee.service';

@Controller('late-fee')
export class LateFeeController {
  constructor(private readonly lateFeeService: LateFeeService) {}
}
