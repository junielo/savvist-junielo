import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../users/schemas/user.schema';
import { AccountEntriesService } from './account-entries.service';
import { CreateAccountEntryDto } from './dto/create-account-entry.dto';
import { FindAccountEntriesDto } from './dto/find-account-entries.dto';
import { UpdateAccountEntryDto } from './dto/update-account-entry.dto';

@UseGuards(CurrentUserGuard)
@Controller('account-entries')
export class AccountEntriesController {
  constructor(
    @Inject(AccountEntriesService)
    private readonly accountEntriesService: AccountEntriesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body() createAccountEntryDto: CreateAccountEntryDto,
  ) {
    return this.accountEntriesService.create(user._id, createAccountEntryDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserDocument,
    @Query() query: FindAccountEntriesDto,
  ) {
    return this.accountEntriesService.findAll(user._id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.accountEntriesService.findOne(user._id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateAccountEntryDto: UpdateAccountEntryDto,
  ) {
    return this.accountEntriesService.update(user._id, id, updateAccountEntryDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.accountEntriesService.remove(user._id, id);
  }
}
