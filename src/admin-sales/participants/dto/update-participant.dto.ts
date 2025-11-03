import { PartialType } from '@nestjs/mapped-types';
import { CreateParticipantDto } from './create-participant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateParticipantDto extends PartialType(CreateParticipantDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
