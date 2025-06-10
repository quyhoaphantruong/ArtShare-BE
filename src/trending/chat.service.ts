// src/modules/chat/services/chat.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { ConversationResponseDto, GeneratedPrompt, MessageResponseDto } from './dto/response/generated-prompt.dto';
import { CreateMessageDto } from './dto/request/create-message.dto';
import { GeminiService } from './gemini.service';
import { ChatRepository } from './repositories/chat.repository';
import { SimpleCacheService } from 'src/infastructure/simple-cache.service';

@Injectable()
export class ChatService {
  private readonly PROMPT_HISTORY_DAYS = 7;
  private readonly CONVERSATION_CONTEXT_LIMIT = 10; // Last 10 messages for context
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly geminiService: GeminiService,
    private readonly cacheService: SimpleCacheService,
  ) {}

  async sendMessage(
    userId: string,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    let conversationId = dto.conversationId;

    if (!conversationId) {
      const conversation = await this.chatRepository.createConversation(
        userId,
        this.generateConversationTitle(dto.content),
      );
      conversationId = conversation.id;
    } else {
      const conversation = await this.chatRepository.getConversationById(
        conversationId,
        userId,
      );
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    }

    await this.chatRepository.createMessage({
      conversationId,
      role: MessageRole.USER,
      content: dto.content,
    });

    // Get conversation context
    const conversationContext =
      await this.getConversationContext(conversationId);

    // Get user's prompt history with caching
    const promptHistory = await this.getCachedUserPromptHistory(userId);

    const generatedPrompts = await this.generateChatResponse(
      dto.content,
      conversationContext,
      promptHistory,
    );

    // Create assistant response
    const assistantMessage = await this.chatRepository.createMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: "",
      metadata: { generatedPrompts },
    });

    return this.mapToMessageResponse(assistantMessage, generatedPrompts);
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.chatRepository.getConversationById(
      conversationId,
      userId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.mapToConversationResponse(conversation);
  }

  async getUserConversations(
    userId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations =
      await this.chatRepository.getUserConversations(userId);
    return conversations.map((conv: any) =>
      this.mapToConversationResponse(conv),
    );
  }

  private async generateChatResponse(
    userMessage: string,
    conversationContext: string[],
    promptHistory: string[],
  ): Promise<GeneratedPrompt[]> {
    const model = this.geminiService.getModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `
      You are an AI art generation assistant helping users refine and discover creative prompts.
      You have access to the user's recent prompt history and current conversation context.
      
      Your task is to:
      1. Understand the user's creative intent from their message
      2. Consider their past preferences from prompt history
      3. Generate 5 unique, inspiring prompts that either:
         - Refine their current idea
         - Explore variations of their concept
         - Suggest new creative directions based on their interests
      
      Each prompt should be:
      - Clear and detailed (20-50 words)
      - Visually descriptive
      - Technically achievable with AI art generation
      - Diverse in style, mood, or perspective
      
      Output format: JSON array of 5 string prompts.
      Example: [prompt1, prompt2, ...]
    `;

    const conversationContextStr =
      conversationContext.length > 0
        ? `Recent conversation:\n${conversationContext.join('\n')}\n\n`
        : '';

    const promptHistoryStr =
      promptHistory.length > 0
        ? `User's recent art preferences (last 7 days):\n${promptHistory.slice(0, 20).join('\n')}\n\n`
        : '';

    const prompt = `
      ${systemPrompt}
      This is prompt history of system: ${promptHistoryStr}
      
      ${conversationContextStr}      
      User's current message: "${userMessage}"
      
      Generate 5 creative prompts based on this context:
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();

      const parsed = JSON.parse(cleanedResponse);
      if (!Array.isArray(parsed) || parsed.length !== 5) {
        throw new Error('Invalid response format');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to generate chat response:', error);
      // Fallback to simple prompt generation
      return this.generateFallbackPrompts(userMessage);
    }
  }

  private async getConversationContext(
    conversationId: string,
  ): Promise<string[]> {
    const messages = await this.chatRepository.getConversationMessages(
      conversationId,
      this.CONVERSATION_CONTEXT_LIMIT,
    );

    return messages.map(
      (msg: { role: any; content: any }) => `${msg.role}: ${msg.content}`,
    );
  }

  private async getCachedUserPromptHistory(userId: string): Promise<string[]> {
    // const cacheKey = `user_prompt_history:${userId}`;

    // // Try to get from cache
    // const cached = await this.cacheService.get<string[]>(cacheKey);
    // if (cached) {
    //   this.logger.log(`Found cache userPromptHistory ${cached}`);
    //   return cached;
    // }

    // Fetch from database
    const prompts = await this.chatRepository.getRecentUserPrompts(
      userId,
      this.PROMPT_HISTORY_DAYS,
    );

    // Cache the result
    // await this.cacheService.set(cacheKey, prompts, this.CACHE_TTL);

    return prompts;
  }

  private generateFallbackPrompts(userMessage: string): GeneratedPrompt[] {
    // Simple fallback logic
    const styles = [
      'realistic',
      'abstract',
      'fantasy',
      'minimalist',
      'surreal',
    ];

    return styles.map((style) => ({
      prompt: `${userMessage} in ${style} style, highly detailed, professional artwork`,
      theme: `${style.charAt(0).toUpperCase() + style.slice(1)} Interpretation`,
    }));
  }

//   private formatAssistantResponse(prompts: GeneratedPrompt[]): string {
//     const intro =
//       "I've generated 5 creative prompts based on your request and artistic preferences:\n\n";
//     const promptList = prompts
//       .map((p, i) => `${i + 1}. **${p.theme}**\n   ${p.prompt}`)
//       .join('\n\n');

//     return intro + promptList;
//   }

  private generateConversationTitle(firstMessage: string): string {
    // Simple title generation from first message
    const words = firstMessage.split(' ').slice(0, 5);
    return (
      words.join(' ') +
      (words.length < firstMessage.split(' ').length ? '...' : '')
    );
  }

  private mapToMessageResponse(
    message: any,
    generatedPrompts?: GeneratedPrompt[],
  ): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      generatedPrompts:
        generatedPrompts || message.metadata?.generatedPrompts || [],
      createdAt: message.createdAt,
    };
  }

  private mapToConversationResponse(
    conversation: any,
  ): ConversationResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      messages:
        conversation.messages?.map((msg: any) =>
          this.mapToMessageResponse(msg),
        ) || [],
    };
  }
}
