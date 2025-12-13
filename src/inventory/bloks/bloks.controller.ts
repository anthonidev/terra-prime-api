import { Controller } from '@nestjs/common';
import { BloksService } from './bloks.service';

@Controller('bloks')
export class BloksController {
  constructor(private readonly bloksService: BloksService) {}
}
