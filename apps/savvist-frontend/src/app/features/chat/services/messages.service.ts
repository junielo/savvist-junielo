import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChatMessage } from '../models/chat-message';

export interface MessageDto {
  _id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'streaming' | 'error';
  createdAt?: string | Date;
}

export interface CreateMessageDto {
  content: string;
  role: 'user' | 'assistant';
  status?: 'complete' | 'streaming' | 'error';
}

export interface SendMessageResponseDto {
  userMessage: MessageDto;
  assistantMessage: MessageDto;
}

export const toChatMessage = (dto: MessageDto): ChatMessage => ({
  id: dto._id,
  role: dto.role,
  content: dto.content,
  status: dto.status,
});

@Service()
export class MessagesService {
  private readonly http = inject(HttpClient);

  async findAll(conversationId: string): Promise<ChatMessage[]> {
    const raw = await firstValueFrom(
      this.http.get<MessageDto[]>(`/api/conversations/${conversationId}/messages`),
    );
    return raw.map(toChatMessage);
  }

  async send(conversationId: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const raw = await firstValueFrom(
      this.http.post<SendMessageResponseDto>(`/api/conversations/${conversationId}/messages/send`, { content }),
    );
    return {
      userMessage: toChatMessage(raw.userMessage),
      assistantMessage: toChatMessage(raw.assistantMessage),
    };
  }

  async create(conversationId: string, dto: CreateMessageDto): Promise<ChatMessage> {
    const raw = await firstValueFrom(
      this.http.post<MessageDto>(`/api/conversations/${conversationId}/messages`, dto),
    );
    return toChatMessage(raw);
  }
}
