import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { JevClient } from './intent/classifiers/jev.client';
import { JevIntentClassifier } from './intent/classifiers/jev.classifier';
import { mongoCheckpointerProvider } from './persistence/mongo-checkpointer.provider';
import { GeminiService } from './llm/gemini.service';
import { SlotExtractor } from './llm/slot-extractor';
import { ReplyWriter } from './llm/reply-writer';
import { ReadTool } from './tools/read.tool';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { ExpensesModule } from '../../expenses/expenses.module';
import { WishlistModule } from '../../wishlist/wishlist.module';
import { RecordLogsModule } from '../../record-logs/record-logs.module';
import { UsersModule } from '../../users/users.module';
import { AccountEntriesModule } from '../../account-entries/account-entries.module';
import { DailyMetricsModule } from '../../daily-metrics/daily-metrics.module';

@Module({
  imports: [
    ConfigModule,
    DashboardModule,
    ExpensesModule,
    WishlistModule,
    RecordLogsModule,
    UsersModule,
    AccountEntriesModule,
    DailyMetricsModule,
  ],
  providers: [
    // 1. Provides CHECKPOINTER
    mongoCheckpointerProvider,

    // 2. Provides INTENT_CLASSIFIER
    {
      provide: INTENT_CLASSIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jev = new JevClient({
          model: config.get<string>('JEV_MODEL', 'jev-latest'),
          timeoutMs: config.get<number>('JEV_TIMEOUT_MS', 5000),
        });
        return new JevIntentClassifier(jev, {
          minConfidence: config.get<number>('INTENT_MIN_CONFIDENCE', 0.6),
          minMargin: config.get<number>('INTENT_MIN_MARGIN', 0.15),
        });
      },
    },

    // 3. LLM & Tools
    GeminiService,
    SlotExtractor,
    ReplyWriter,
    ReadTool,

    // 4. The main agent service
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
