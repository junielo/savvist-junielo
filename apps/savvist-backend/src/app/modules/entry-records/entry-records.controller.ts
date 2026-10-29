import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../users/schemas/user.schema';
import { DeleteBalanceDto } from './dto/delete-balance.dto';
import { FindEntryRecordsDto } from './dto/find-entry-records.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { EntryRecordsService } from './entry-records.service';

@UseGuards(CurrentUserGuard)
@Controller('entry-records')
export class EntryRecordsController {
  constructor(
    @Inject(EntryRecordsService)
    private readonly entryRecordsService: EntryRecordsService,
  ) {}

  @Get()
  findByDate(
    @CurrentUser() user: UserDocument,
    @Query() query: FindEntryRecordsDto,
  ) {
    return this.entryRecordsService.findByDate(user._id, query);
  }

  @Post()
  updateBalance(
    @CurrentUser() user: UserDocument,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ) {
    return this.entryRecordsService.updateBalance(user._id, updateBalanceDto);
  }

  @Post('upsert')
  upsertAmount(
    @CurrentUser() user: UserDocument,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ) {
    return this.entryRecordsService.upsertAmount(user._id, updateBalanceDto);
  }

  @Delete(':id')
  deleteById(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.entryRecordsService.deleteBalanceById(user._id, id);
  }

  @Delete()
  deleteByQuery(
    @CurrentUser() user: UserDocument,
    @Query() deleteBalanceDto: DeleteBalanceDto,
  ) {
    return this.entryRecordsService.deleteBalance(user._id, deleteBalanceDto);
  }
}
