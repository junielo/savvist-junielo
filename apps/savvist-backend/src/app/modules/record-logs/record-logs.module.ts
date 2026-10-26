import { Module } from '@nestjs/common';
import { RecordLogsService } from './record-logs.service';
import { RecordLogsController } from './record-logs.controller';

@Module({
  controllers: [RecordLogsController],
  providers: [RecordLogsService],
})
export class RecordLogsModule {}
