import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations/conversations.controller';
import { ConversationsService } from './conversations/conversations.service';
import { Conversation, ConversationSchema } from './conversations/schemas/conversation.schema';
import { MessagesController } from './messages/messages.controller';
import { MessagesService } from './messages/messages.service';
import { Message, MessageSchema } from './messages/schemas/message.schema';
import { DatabaseModule } from '../../database/database.module';
import { AgentModule } from './agent/agent.module';
import { UsersModule } from '../users/users.module';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    DatabaseModule,
    AgentModule,
    UsersModule,
  ],
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService, MessagesService, CurrentUserGuard],
  exports: [ConversationsService, MessagesService, MongooseModule],
})
export class ChatModule {}
