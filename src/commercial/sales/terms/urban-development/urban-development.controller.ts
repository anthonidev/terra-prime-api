import { Controller } from '@nestjs/common';
import { UrbanDevelopmentService } from './urban-development.service';

@Controller('urban-development')
export class UrbanDevelopmentController {
  constructor(private readonly urbanDevelopmentService: UrbanDevelopmentService) {}
}
