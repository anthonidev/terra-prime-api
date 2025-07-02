import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

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
}

export class GetChatHistoryDto {
  @IsUUID()
  sessionId: string;
}

export class ChatHistoryResponseDto {
  success: boolean;
  sessionId: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}
