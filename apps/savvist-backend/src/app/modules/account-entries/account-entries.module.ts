import { Module } from '@nestjs/common';
import { AccountEntriesService } from './account-entries.service';
import { AccountEntriesController } from './account-entries.controller';

@Module({
  controllers: [AccountEntriesController],
  providers: [AccountEntriesService],
})
export class AccountEntriesModule {}
