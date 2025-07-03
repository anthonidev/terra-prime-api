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
import { ChatbotService } from '../services/chatbot.service';
import { JwtUser } from 'src/auth/interface/jwt-payload.interface';
import { ContextService } from '../services/context.service';

@Controller('chatbot/help')
@UseGuards(JwtAuthGuard)
export class HelpController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Obtener ayuda rápida personalizada por rol
   */
  @Get('quick-help')
  async getQuickHelp(@GetUser() user: JwtUser) {
    try {
      const helpQuestions = await this.contextService.getQuickHelp(
        user.role.code,
      );

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
    @GetUser() user: JwtUser,
    @Param('guideKey') guideKey: string,
  ) {
    try {
      const guide = await this.contextService.getStepByStepGuide(
        guideKey,
        user.role.code,
      );

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
    @GetUser() user: JwtUser,
    @Body() { query }: { query: string },
  ) {
    try {
      const results = await this.contextService.searchContextContent(
        query,
        user.role.code,
      );

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
    @GetUser() user: JwtUser,
    @Query('issue') issue?: string,
  ) {
    try {
      const troubleshooting = this.contextService.getTroubleshootingHelp(issue);

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
   * Obtener lista de guías disponibles para el rol del usuario
   */
  @Get('available-guides')
  async getAvailableGuides(@GetUser() user: JwtUser) {
    try {
      const guides = await this.chatbotService.getAvailableGuides(user);

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
