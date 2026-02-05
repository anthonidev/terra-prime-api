import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { SaleFilesService } from './sale-files.service';
import { CreateSaleFileDto } from './dto/create-sale-file.dto';

@Controller('sale-files')
export class SaleFilesController {
  constructor(private readonly saleFilesService: SaleFilesService) {}

  @Post(':saleId')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() createSaleFileDto: CreateSaleFileDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 10, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.saleFilesService.create(saleId, createSaleFileDto, file);
  }

  @Get('sale/:saleId')
  async findBySaleId(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.saleFilesService.findBySaleId(saleId);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleFilesService.remove(id);
  }
}
