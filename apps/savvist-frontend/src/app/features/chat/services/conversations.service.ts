import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChatSession } from '../models/chat-session';

export interface ConversationDto {
  _id: string;
  userId: string;
  title: string;
  lastMessageAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateConversationDto {
  title?: string;
}

export interface UpdateConversationDto {
  title?: string;
}

export const toChatSession = (dto: ConversationDto): ChatSession => ({
  id: dto._id,
  title: dto.title,
});

@Service()
export class ConversationsService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<ChatSession[]>(() => '/api/conversations', {
    defaultValue: [],
    parse: (raw) => (raw as ConversationDto[]).map(toChatSession),
  });

  readonly conversations = this.resource.value;
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }

  async findAll(): Promise<ChatSession[]> {
    const raw = await firstValueFrom(
      this.http.get<ConversationDto[]>('/api/conversations'),
    );
    return raw.map(toChatSession);
  }

  async findOne(id: string): Promise<ChatSession> {
    const raw = await firstValueFrom(
      this.http.get<ConversationDto>(`/api/conversations/${id}`),
    );
    return toChatSession(raw);
  }

  async create(dto?: CreateConversationDto): Promise<ChatSession> {
    const raw = await firstValueFrom(
      this.http.post<ConversationDto>('/api/conversations', dto ?? {}),
    );
    this.reload();
    return toChatSession(raw);
  }

  async update(id: string, dto: UpdateConversationDto): Promise<ChatSession> {
    const raw = await firstValueFrom(
      this.http.patch<ConversationDto>(`/api/conversations/${id}`, dto),
    );
    this.reload();
    return toChatSession(raw);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`/api/conversations/${id}`),
    );
    this.reload();
  }

  async deleteConversation(id: string): Promise<void> {
    return this.remove(id);
  }
}
