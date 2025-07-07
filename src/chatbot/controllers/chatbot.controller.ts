import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { CHATBOT_SERVICE } from 'src/config/services';
import { SendMessageDto } from '../dto/message.dto';
import { ChatbotRateLimitGuard } from '../guards/rate-limit.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(
    @Inject(CHATBOT_SERVICE)
    private readonly chatbotClient: ClientProxy,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Post('message')
  @UseGuards(ChatbotRateLimitGuard)
  async sendMessage(@GetUser() user: JwtUser, @Body() dto: SendMessageDto) {
    try {
      const infoUser = await this.getFullUserInfo(user.id);
      return this.chatbotClient.send(
        { cmd: 'chatbot.send.message' },
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: infoUser.firstName,
            lastName: infoUser.lastName,
            fullName: `${infoUser.firstName} ${infoUser.lastName}`,
            role: user.role,
          },
          data: dto,
        },
      );
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  @Get('history/:sessionId')
  getChatHistory(
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatbotClient.send(
      { cmd: 'chatbot.session.get-history' },
      { user: user, sessionId },
    );
  }

  @Get('sessions')
  getUserSessions(@GetUser() user: JwtUser) {
    return this.chatbotClient.send(
      { cmd: 'chatbot.sessions.get-all' },
      { id: user.id },
    );
  }

  @Patch('session/:sessionId/close')
  closeSession(
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatbotClient.send(
      { cmd: 'chatbot.session.close' },
      { userId: user.id, sessionId },
    );
  }

  @Delete('session/:sessionId')
  deleteSession(
    @GetUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatbotClient.send(
      { cmd: 'chatbot.session.delete' },
      { userId: user.id, sessionId },
    );
  }

  @Get('rate-limit/status')
  getRateLimitStatus(@GetUser() user: JwtUser) {
    return this.chatbotClient.send({ cmd: 'chatbot.rate-limit.status' }, user);
  }

  private async getFullUserInfo(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    return user;
  }
}
