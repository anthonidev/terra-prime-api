import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Guarantor } from './entities/guarantor.entity';
import { Repository, QueryRunner } from 'typeorm';
import { CreateGuarantorDto } from './dto/create-guarantor.dto';
import { formatGuarantorResponse } from './helpers/format-guarantor-response';
import { GuarantorResponse } from './interfaces/guarantor-response.interface';

@Injectable()
export class GuarantorsService {
  constructor(
    @InjectRepository(Guarantor)
    private readonly guarantorRepository: Repository<Guarantor>,
  ) {}
  // Methods for endpoints
  async create(
    createGuarantorDto: CreateGuarantorDto,
    queryRunner?: QueryRunner,
  ): Promise<GuarantorResponse> {
  // Verificar si ya existe un garante con el mismo documento
  const repository = queryRunner
    ? queryRunner.manager.getRepository(Guarantor)
    : this.guarantorRepository;
  const existingGuarantor = await repository.findOne({
    where: { document: createGuarantorDto.document },
  });
  let guarantor: Guarantor;
  if (existingGuarantor)
    guarantor = await repository.preload({
      id: existingGuarantor.id,
      ...createGuarantorDto
    });
  if (!existingGuarantor) guarantor = repository.create(createGuarantorDto);
  await repository.save(guarantor);
  return formatGuarantorResponse(guarantor);
}

  async findOneById(id: number): Promise<Guarantor> {
    const guarantor = await this.guarantorRepository.findOne({
      where: { id },
      relations: ['clients'],
    });
    if (!guarantor)
      throw new NotFoundException(`El aval con ID ${id} no se encuentra registrado`);
    return guarantor;
  }

  async isValidGuarantor(guarantorId: number): Promise<Guarantor> {
    const guarantor = await this.guarantorRepository.findOne({
      where: { id: guarantorId },
    });
    if (!guarantor)
      throw new NotFoundException(
        `El garante con ID ${guarantorId} no se encuentra registrado`
      );
    return guarantor;
  }
}
