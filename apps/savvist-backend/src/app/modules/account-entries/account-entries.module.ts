import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UsersModule } from '../users/users.module';
import { AccountEntriesController } from './account-entries.controller';
import { AccountEntriesService } from './account-entries.service';
import { AccountEntry, AccountEntrySchema } from './schemas/account-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountEntry.name, schema: AccountEntrySchema },
    ]),
    UsersModule,
  ],
  controllers: [AccountEntriesController],
  providers: [AccountEntriesService, CurrentUserGuard],
  exports: [AccountEntriesService, MongooseModule],
})
export class AccountEntriesModule {}
