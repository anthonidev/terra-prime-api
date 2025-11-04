// src/modules/lot/services/admin-token.service.ts
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { AdminToken } from '../entities/admin-token.entity';

@Injectable()
export class AdminTokenService {

  constructor(
    @InjectRepository(AdminToken)
    private readonly adminTokenRepository: Repository<AdminToken>,
  ) {}

  private generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString().slice(1);
}

  async getActiveTokenInfo(): Promise<{ pin: string | null; expiresAt?: Date }> {
    const now = new Date();
    const token = await this.adminTokenRepository.findOne({
      where: { expiresAt: MoreThan(now) },
    });

    if (!token) return { pin: null};
    return { pin: token.codeHash, expiresAt: token.expiresAt };
  }

  async createPin(
    userId: string,
  ): Promise<{ pin: string, expiresAt: Date }> {
    const now = new Date();
    const existingToken = await this.adminTokenRepository.findOne({
      where: {
        expiresAt: MoreThan(now),
      },
    });
    if (existingToken)
      throw new ConflictException('Ya existe un token vigente. Espere a que expire antes de generar uno nuevo.');

    const expiration = new Date(now.getTime() + 15 * 60 * 1000);
    const pin = this.generateCode();

    const newToken = this.adminTokenRepository.create({
      generatedBy: { id: userId },
      codeHash: pin,
      expiresAt: expiration,
    });

    await this.adminTokenRepository.save(newToken);
    return { pin, expiresAt: expiration };
  }

  async validateToken(token: string): Promise<boolean> {
    const tokenFound = await this.adminTokenRepository.findOne({
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