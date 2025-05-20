import { PartialType } from '@nestjs/mapped-types';
import { CreateFinancingTypeDto } from './create-financing-type.dto';

export class UpdateFinancingTypeDto extends PartialType(CreateFinancingTypeDto) {}
