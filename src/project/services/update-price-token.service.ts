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
  return Math.floor(100000 + Math.random() * 900000).toString().slice(1);
}

  async getActiveTokenInfo(): Promise<{ pin: string | null; expiresAt?: Date }> {
    const now = new Date();
    const token = await this.updatePriceTokenRepository.findOne({
      where: { expiresAt: MoreThan(now) },
    });

    if (!token) return { pin: null};
    return { pin: token.codeHash, expiresAt: token.expiresAt };
  }

  async createPin(
    userId: string,
  ): Promise<{ pin: string, expiresAt: Date }> {
    const now = new Date();
    const existingToken = await this.updatePriceTokenRepository.findOne({
      where: {
        expiresAt: MoreThan(now),
      },
    });
    if (existingToken)
      throw new ConflictException('Ya existe un token vigente. Espere a que expire antes de generar uno nuevo.');

    const expiration = new Date(now.getTime() + 15 * 60 * 1000);
    const pin = this.generateCode();

    const newToken = this.updatePriceTokenRepository.create({
      generatedBy: { id: userId },
      codeHash: pin,
      expiresAt: expiration,
    });

    await this.updatePriceTokenRepository.save(newToken);
    return { pin, expiresAt: expiration };
  }

  async validateToken(token: string): Promise<boolean> {
    const tokenFound = await this.updatePriceTokenRepository.findOne({
      where: { codeHash: token },
    });

    if (!tokenFound)
      throw new ConflictException('El token ingresado no es válido.');

    const now = new Date();
    if (tokenFound.expiresAt <= now)
      throw new ConflictException('El token ha expirado.');

    return true;
  }
}