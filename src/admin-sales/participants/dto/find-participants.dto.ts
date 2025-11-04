import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { ParticipantType } from '../entities/participant.entity';

export class FindParticipantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ParticipantType, { message: 'El tipo de participante debe ser válido' })
  type?: ParticipantType;
}
