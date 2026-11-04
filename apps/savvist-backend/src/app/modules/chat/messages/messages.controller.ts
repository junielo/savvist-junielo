import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../../users/schemas/user.schema';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(4000)
  content!: string;
}

@UseGuards(CurrentUserGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(
    @Inject(MessagesService)
    private readonly messagesService: MessagesService,
  ) {}

  @Post('send')
  send(
    @CurrentUser() user: UserDocument,
    @Param('conversationId', ParseObjectIdPipe) conversationId: Types.ObjectId,
    @Body() dto: SendMessageDto) {
    return this.messagesService.send(user._id, conversationId, dto.content);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserDocument,
    @Param('conversationId', ParseObjectIdPipe) conversationId: Types.ObjectId,
  ) {
    return this.messagesService.findAll(user._id, conversationId);
  }

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Param('conversationId', ParseObjectIdPipe) conversationId: Types.ObjectId,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.create(user._id, conversationId, createMessageDto);
  }
}
