// src/modules/lot/services/update-price-token.service.ts
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { UpdatePriceToken } from '../entities/update-price-token.entity';
import * as bcrypt from 'bcryptjs'; // Importa bcrypt
import { LotService } from './lot.service';
import { UsersService } from 'src/user/user.service';

@Injectable()
export class UpdatePriceTokenService {

  constructor(
    @InjectRepository(UpdatePriceToken)
    private readonly updatePriceTokenRepository: Repository<UpdatePriceToken>,
    @Inject(forwardRef(() => LotService))
    private readonly lotService: LotService,
    private readonly userService: UsersService,
  ) {}

  private generateCode(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createPin(userId: string, lotId: string): Promise<{pin: string}> {
    await this.lotService.isLotValidForSale(lotId);
    await this.userService.isValidSalesManager(userId);

    const now = new Date();
    const expiration = new Date(now.getTime() + 15 * 60 * 1000);
    const pin = this.generateCode();
    const hashedPin = await bcrypt.hash(pin, 10);

    const existingToken = await this.updatePriceTokenRepository.findOne({
      where: {
        lot: { id: lotId },
        isUsed: false,
      },
    });

    if (existingToken) {
      existingToken.codeHash = hashedPin;
      existingToken.expiresAt = expiration;
      await this.updatePriceTokenRepository.save(existingToken);
      return { pin };
    }

    const newToken = this.updatePriceTokenRepository.create({
      codeHash: hashedPin,
      lot: { id: lotId },
      expiresAt: expiration,
      generatedBy: { id: userId },
      isUsed: false,
    });

    await this.updatePriceTokenRepository.save(newToken);
    return { pin };
  }

  async getValidTokenByLot(token: string, lotId: string): Promise<UpdatePriceToken> {
    const now = new Date();
    const tokenEntity = await this.updatePriceTokenRepository.findOne({
      where: {
        lot: { id: lotId },
        isUsed: false,
        expiresAt: MoreThan(now),
      },
      relations: ['lot'],
    });

    if (!tokenEntity)
      throw new NotFoundException('No se encontró un token válido para este lote.');

    const isMatch = await bcrypt.compare(token, tokenEntity.codeHash);
    if (!isMatch)
      throw new ConflictException('El token ingresado no es válido.');

    return tokenEntity;
  }

  async markTokenAsUsed(tokenEntity: UpdatePriceToken): Promise<void> {
    tokenEntity.isUsed = true;
    await this.updatePriceTokenRepository.save(tokenEntity);
  }
}