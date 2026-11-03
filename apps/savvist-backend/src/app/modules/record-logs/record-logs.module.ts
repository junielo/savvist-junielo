import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UsersModule } from '../users/users.module';
import { RecordLogsService } from './record-logs.service';
import { RecordLogsController } from './record-logs.controller';
import { RecordLog, RecordLogSchema } from './schemas/record-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecordLog.name, schema: RecordLogSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [RecordLogsController],
  providers: [RecordLogsService, CurrentUserGuard],
  exports: [RecordLogsService, MongooseModule],
})
export class RecordLogsModule {}
