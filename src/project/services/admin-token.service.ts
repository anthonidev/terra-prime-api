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

    // Buscar token vigente existente
    const existingToken = await this.adminTokenRepository.findOne({
      where: {
        expiresAt: MoreThan(now),
      },
    });
    // Si existe un token vigente, anularlo (marcar como expirado)
    if (existingToken) {
      existingToken.expiresAt = new Date(now.getTime() - 1000); // Expirado hace 1 segundo
      await this.adminTokenRepository.save(existingToken);
    }
    // Crear nuevo token
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