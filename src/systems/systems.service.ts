import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SystemsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async updatePassword(email: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user)
      throw new NotFoundException('El usuario no está registrado');
    const hashedPassword = bcrypt.hashSync(password, 10);
    user.password = hashedPassword;
    return await this.userRepository.save(user);
  }
}
