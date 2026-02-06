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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { SaleFilesService } from './sale-files.service';
import { CreateSaleFileDto } from './dto/create-sale-file.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('sale-files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SaleFilesController {
  constructor(private readonly saleFilesService: SaleFilesService) {}

  @Post(':saleId')
  @Roles('ADM', 'JVE', 'VEN')
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
  @Roles('ADM', 'JVE', 'VEN')
  async findBySaleId(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.saleFilesService.findBySaleId(saleId);
  }

  @Delete(':id')
  @Roles('ADM', 'JVE', 'VEN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleFilesService.remove(id);
  }
}
