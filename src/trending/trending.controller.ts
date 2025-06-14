import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { ConversationResponseDto, MessageResponseDto } from './dto/response/generated-prompt.dto';
import { CreateMessageDto } from './dto/request/create-message.dto';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('trending')
@UseGuards(JwtAuthGuard)
export class TrendingController {
  constructor(private readonly trendingService: TrendingService,
    private readonly chatService: ChatService,
  ) {}

  @Get('promtps')
  async getTrendingPrompts() {
    return this.trendingService.getTrendingPrompts();
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Get('conversations')
  async getUserConversations(
    @CurrentUser() user: { id: string },
  ): Promise<ConversationResponseDto[]> {
    return this.chatService.getUserConversations(user.id);
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: { id: string },
    @Param('id') conversationId: string,
  ): Promise<ConversationResponseDto> {
    return this.chatService.getConversation(user.id, conversationId);
  }
}
