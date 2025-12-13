import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@iam/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByDocumentForAuth(document: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.password')
      .where('user.document = :document', { document })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('role.isActive = :roleIsActive', { roleIsActive: true })
      .getOne();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }
}
