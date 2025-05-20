import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentsConfigDto } from './create-payments-config.dto';

export class UpdatePaymentsConfigDto extends PartialType(CreatePaymentsConfigDto) {}
