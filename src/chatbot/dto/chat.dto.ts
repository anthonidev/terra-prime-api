import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  message: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class ChatResponseDto {
  success: boolean;
  message: string;
  sessionId: string;
  response: string;
  timestamp: Date;
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
    isWarning: boolean;
  };
  metadata?: {
    sessionTitle?: string;
    isNewSession?: boolean;
  };
}

export class GetChatHistoryDto {
  @IsUUID()
  sessionId: string;
}

export class ChatHistoryResponseDto {
  success: boolean;
  sessionId: string;
  title: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

export class UpdateSessionTitleDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @MaxLength(200, { message: 'El título no puede tener más de 200 caracteres' })
  title: string;
}

export class SessionListResponseDto {
  success: boolean;
  sessions: Array<{
    id: string;
    title: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
  }>;
}
