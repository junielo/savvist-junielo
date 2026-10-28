import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { AccountEntriesModule } from '../account-entries/account-entries.module';
import { UsersModule } from '../users/users.module';
import { EntryRecordsController } from './entry-records.controller';
import { EntryRecordsService } from './entry-records.service';
import { EntryRecord, EntryRecordSchema } from './schemas/entry-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EntryRecord.name, schema: EntryRecordSchema },
    ]),
    AccountEntriesModule,
    UsersModule,
  ],
  controllers: [EntryRecordsController],
  providers: [EntryRecordsService, CurrentUserGuard],
  exports: [EntryRecordsService, MongooseModule],
})
export class EntryRecordsModule {}
