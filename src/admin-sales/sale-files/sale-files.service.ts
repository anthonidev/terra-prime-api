import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleFile } from './entities/sale-file.entity';
import { CreateSaleFileDto } from './dto/create-sale-file.dto';
import { Sale } from '../sales/entities/sale.entity';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { formatSaleFileResponse, formatSaleFilesResponse } from './helpers/format-sale-file-response';
import { SaleFileResponse } from './interfaces/sale-file-response.interface';

@Injectable()
export class SaleFilesService {
  constructor(
    @InjectRepository(SaleFile)
    private readonly saleFileRepository: Repository<SaleFile>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(
    saleId: string,
    createSaleFileDto: CreateSaleFileDto,
    file: Express.Multer.File,
  ): Promise<SaleFileResponse> {
    // Validar que el archivo exista
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    // Validar que la venta exista
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID ${saleId} no existe`);
    }

    // Subir archivo a S3 (permite cualquier tipo de archivo)
    const s3Response = await this.awsS3Service.uploadFileAnyType(file, 'sale-files');

    // Crear el registro
    const saleFile = this.saleFileRepository.create({
      sale,
      url: s3Response.url,
      urlKey: s3Response.key,
      description: createSaleFileDto.description,
    });

    await this.saleFileRepository.save(saleFile);

    return formatSaleFileResponse(saleFile);
  }

  async findBySaleId(saleId: string): Promise<SaleFileResponse[]> {
    // Validar que la venta exista
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID ${saleId} no existe`);
    }

    const saleFiles = await this.saleFileRepository.find({
      where: { sale: { id: saleId } },
      order: { createdAt: 'DESC' },
    });

    return formatSaleFilesResponse(saleFiles);
  }

  async remove(id: number): Promise<{ message: string }> {
    const saleFile = await this.saleFileRepository.findOne({
      where: { id },
    });

    if (!saleFile) {
      throw new NotFoundException(`El archivo con ID ${id} no existe`);
    }

    // Eliminar archivo de S3
    await this.awsS3Service.deleteFile(saleFile.urlKey);

    // Eliminar registro de la base de datos
    await this.saleFileRepository.remove(saleFile);

    return { message: 'Archivo eliminado correctamente' };
  }
}
