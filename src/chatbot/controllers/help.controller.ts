import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';
import { ChatbotService } from '../services/chatbot.service';

@Controller('chatbot/help')
@UseGuards(JwtAuthGuard)
export class HelpController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Obtener ayuda rápida personalizada por rol
   */
  @Get('quick-help')
  async getQuickHelp(@GetUser() user: User) {
    try {
      const helpQuestions = this.chatbotService.getQuickHelpForUser(user);

      return {
        success: true,
        help: helpQuestions,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener ayuda rápida',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener guía paso a paso específica
   */
  @Get('guide/:guideKey')
  async getStepByStepGuide(
    @GetUser() user: User,
    @Param('guideKey') guideKey: string,
  ) {
    try {
      const guide = this.chatbotService.getStepByStepGuide(guideKey, user);

      if (!guide) {
        return {
          success: false,
          message: 'Guía no encontrada o no disponible para tu rol',
        };
      }

      return {
        success: true,
        guide,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener la guía',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Buscar contenido relevante en el contexto
   */
  @Post('search-context')
  async searchContext(
    @GetUser() user: User,
    @Body() { query }: { query: string },
  ) {
    try {
      const results = this.chatbotService.searchContextContent(query, user);

      return {
        success: true,
        query,
        results,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al buscar contenido',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener ayuda para solución de problemas
   */
  @Get('troubleshooting')
  async getTroubleshooting(
    @GetUser() user: User,
    @Query('issue') issue?: string,
  ) {
    try {
      const troubleshooting = this.chatbotService.getTroubleshootingHelp(issue);

      return {
        success: true,
        troubleshooting,
        filtered: !!issue,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener ayuda de troubleshooting',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener información del sistema (versión, configuración, etc.)
   */
  @Get('system-info')
  async getSystemInfo(@GetUser() user: User) {
    try {
      const systemInfo = this.chatbotService.getSystemInfo();

      return {
        success: true,
        systemInfo,
        userInfo: {
          name: user.fullName,
          email: user.email,
          role: {
            code: user.role.code,
            name: user.role.name,
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener información del sistema',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtener lista de guías disponibles para el rol del usuario
   */
  @Get('available-guides')
  async getAvailableGuides(@GetUser() user: User) {
    try {
      const guides = this.chatbotService.getAvailableGuides(user);

      return {
        success: true,
        guides,
        userRole: {
          code: user.role.code,
          name: user.role.name,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener guías disponibles',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
