import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordLogsService } from './record-logs.service';
import { RecordLogsController } from './record-logs.controller';
import { RecordLog, RecordLogSchema } from './schemas/record-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecordLog.name, schema: RecordLogSchema },
    ]),
  ],
  controllers: [RecordLogsController],
  providers: [RecordLogsService],
  exports: [RecordLogsService, MongooseModule],
})
export class RecordLogsModule {}
