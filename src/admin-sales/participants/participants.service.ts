import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from './entities/participant.entity';
import { FindParticipantsActivesDto } from './dto/find-participants-actives.dto';
import {
  ParticipantResponse,
  ParticipantResponseActive,
} from './interfaces/participants-actives-response.interface';
import {
  formatParticipantResponse,
  formatParticipantResponseActive,
} from './helpers/format-participants-actives-response.helper';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
  ) {}
  async create(
    createParticipantDto: CreateParticipantDto,
  ): Promise<ParticipantResponse> {
    const existingParticipant = await this.participantRepository.findOne({
      where: { document: createParticipantDto.document },
    });
    if (existingParticipant)
      throw new BadRequestException(
        `Ya existe un participante con el documento ${createParticipantDto.document}`,
      );

    // Crear el participante
    const participant = this.participantRepository.create(createParticipantDto);
    const savedParticipant = await this.participantRepository.save(participant);
    return formatParticipantResponse(savedParticipant);
  }

  async findAll(): Promise<ParticipantResponse[]> {
    const participants = await this.participantRepository.find({
      // where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return participants.map(formatParticipantResponse);
  }

  async findOne(id: string): Promise<ParticipantResponse> {
    const participant = await this.participantRepository.findOne({
      where: { id },
    });
    if (!participant)
      throw new NotFoundException(`Participante con ID ${id} no encontrado`);
    return formatParticipantResponse(participant);
  }

  async update(
    id: string,
    updateParticipantDto: UpdateParticipantDto,
  ): Promise<ParticipantResponse> {
    // Verificar que el participante existe
    const existingParticipant = await this.participantRepository.findOne({
      where: { id },
    });
    if (!existingParticipant)
      throw new NotFoundException(`Participante con ID ${id} no encontrado`);

    // Validar documento único si se está actualizando
    if (
      updateParticipantDto.document &&
      updateParticipantDto.document !== existingParticipant.document
    ) {
      const duplicateDocument = await this.participantRepository.findOne({
        where: { document: updateParticipantDto.document },
      });
      if (duplicateDocument)
        throw new BadRequestException(
          `Ya existe un participante con el documento ${updateParticipantDto.document}`,
        );
    }

    const participantToUpdate = await this.participantRepository.preload({
      id,
      ...updateParticipantDto,
    });
    const updatedParticipant =
      await this.participantRepository.save(participantToUpdate);
    return formatParticipantResponse(updatedParticipant);
  }

  async remove(id: string): Promise<{ message: string }> {
    // Verificar que el participante existe
    const participant = await this.participantRepository.findOne({
      where: { id },
    });
    if (!participant)
      throw new NotFoundException(`Participante con ID ${id} no encontrado`);
    await this.participantRepository.remove(participant);
    return {
      message: `Participante ${participant.firstName} ${participant.lastName} eliminado exitosamente`,
    };
  }

  async validateParticipantByType(
    participantId: string,
    expectedType: string,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
    });
    if (!participant) {
      throw new NotFoundException(
        `Participante con ID ${participantId} no encontrado`,
      );
    }

    if (participant.participantType !== expectedType) {
      throw new BadRequestException(
        `El participante que se está asginando a ${expectedType} es de tipo ${participant.participantType}`,
      );
    }
  }

  async findAllParticipantsActives(
    findParticipantsDto: FindParticipantsActivesDto,
  ): Promise<ParticipantResponseActive[]> {
    const { type } = findParticipantsDto;
    // Construir las condiciones where
    const whereCondition = type
      ? { participantType: type, isActive: true }
      : { isActive: true };
    // Obtener participantes
    const participants = await this.participantRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
    // Formatear y retornar la respuesta
    return participants.map(formatParticipantResponseActive);
  }
}
