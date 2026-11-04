import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../../users/schemas/user.schema';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@UseGuards(CurrentUserGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    @Inject(ConversationsService)
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.conversationsService.findAll(user._id);
  }

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.create(user._id, createConversationDto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.conversationsService.findOne(user._id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(user._id, id, updateConversationDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.conversationsService.remove(user._id, id);
  }
}
