import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SecondaryClient } from './entities/secondary-client.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateSecondaryClientDto } from './dto/create-secondary-client.dto';
import { SecondaryClientSale } from './entities/secondary-client-sale.entity';

@Injectable()
export class SecondaryClientService {
  constructor(
    @InjectRepository(SecondaryClient)
    private readonly secondaryClientRepository: Repository<SecondaryClient>,
    @InjectRepository(SecondaryClientSale)
    private readonly secondaryClientSaleRepository: Repository<SecondaryClientSale>,
  ) {}

  async createOrUpdate(
    createSecondaryClientDto: CreateSecondaryClientDto,
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<SecondaryClient> {
    const { document, firstName, lastName, email, phone, address } = createSecondaryClientDto;
    const repository = queryRunner 
      ? queryRunner.manager.getRepository(SecondaryClient) 
      : this.secondaryClientRepository;
    const secondaryClient = await repository.findOne({ where: { document } });
    if (secondaryClient) {
      return await repository.save({
        ...secondaryClient,
        firstName,
        lastName,
        email,
        phone,
        address,
      });
    }
    return await repository.save({
      firstName,
      lastName,
      email,
      phone,
      address,
      document,
      documentType: createSecondaryClientDto.documentType,
      user: { id: userId },
    });
  }

  async createSecondaryClientSale(
    saleId: string,
    secondaryClientId: number,
    queryRunner?: QueryRunner,
  ): Promise<SecondaryClientSale> {
    const repository = queryRunner 
      ? queryRunner.manager.getRepository(SecondaryClientSale) 
      : this.secondaryClientSaleRepository;
    const secondaryClientSale = repository.create({
      sale: { id: saleId },
      secondaryClient: { id: secondaryClientId },
    });
    return await repository.save(secondaryClientSale);
  }

  async isValidSecondaryClient(id: number): Promise<SecondaryClient> {
    const exists = await this.secondaryClientRepository.findOne({ where: { id } });
    if (!exists)
      throw new BadRequestException(`El cliente secundario con ID ${id} no existe`);
    return exists;
  }
}
