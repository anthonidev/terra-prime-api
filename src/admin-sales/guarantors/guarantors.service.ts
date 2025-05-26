import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Guarantor } from './entities/guarantor.entity';
import { Repository } from 'typeorm';
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
  async create(createGuarantorDto: CreateGuarantorDto)
  : Promise<GuarantorResponse> {
    const isValidDocument = await this.guarantorRepository.findOne({
      where: { document: createGuarantorDto.document },
    });
    if (isValidDocument)
      throw new ConflictException(
        `Ya existe un aval con el documento ${createGuarantorDto.document}`,
      );
    const guarantor = this.guarantorRepository.create(createGuarantorDto);
    await this.guarantorRepository.save(guarantor);
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
}
