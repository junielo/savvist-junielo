import { Module } from '@nestjs/common';
import { EntryRecordsService } from './entry-records.service';
import { EntryRecordsController } from './entry-records.controller';

@Module({
  controllers: [EntryRecordsController],
  providers: [EntryRecordsService],
})
export class EntryRecordsModule {}
