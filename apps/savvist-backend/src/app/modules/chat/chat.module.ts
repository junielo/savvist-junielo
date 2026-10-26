import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsService } from './conversations/conversations.service';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { AgentService } from './agent/agent.service';

@Module({
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService, MessagesService, AgentService],
})
export class ChatModule {}
