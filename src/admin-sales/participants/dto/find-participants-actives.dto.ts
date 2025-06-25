import { IsOptional, IsEnum } from 'class-validator';
import { ParticipantType } from '../entities/participant.entity'; // Ajusta la ruta según tu estructura
import { PaginationDto } from 'src/common/dto/paginationDto';

export class FindParticipantsActivesDto {
  @IsOptional()
  @IsEnum(ParticipantType, { message: 'El tipo de participante debe ser válido' })
  type?: ParticipantType;
}