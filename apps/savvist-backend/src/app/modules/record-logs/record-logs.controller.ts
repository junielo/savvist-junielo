import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { RecordLogsService } from './record-logs.service';

@UseGuards(CurrentUserGuard)
@Controller('record-logs')
export class RecordLogsController {
  constructor(private readonly recordLogsService: RecordLogsService) {}

  @Get()
  getAll(@CurrentUser() user: UserDocument) {
    return this.recordLogsService.getAll(user._id);
  }
}
