import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { JevClient } from './intent/classifiers/jev.client';
import { JevIntentClassifier } from './intent/classifiers/jev.classifier';
import { mongoCheckpointerProvider } from './persistence/mongo-checkpointer.provider';
import { GeminiService } from './llm/gemini.service';
import { QueryRewriter } from './llm/query-rewriter';
import { SlotExtractor } from './llm/slot-extractor';
import { ReplyWriter } from './llm/reply-writer';
import { ReadTool } from './tools/read.tool';
import { CapabilityCheckService } from './capabilities/capability-check.service';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { ExpensesModule } from '../../expenses/expenses.module';
import { WishlistModule } from '../../wishlist/wishlist.module';
import { RecordLogsModule } from '../../record-logs/record-logs.module';
import { UsersModule } from '../../users/users.module';
import { AccountEntriesModule } from '../../account-entries/account-entries.module';
import { DailyMetricsModule } from '../../daily-metrics/daily-metrics.module';
import { ObservabilityModule } from './observability/observability.module';
import { ObservabilityService } from './observability/observability.service';

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
    ObservabilityModule,
  ],
  providers: [
    // 1. Provides CHECKPOINTER
    mongoCheckpointerProvider,

    // 2. Provides JevClient and INTENT_CLASSIFIER
    {
      provide: JevClient,
      inject: [ConfigService, ObservabilityService],
      useFactory: (config: ConfigService, observability: ObservabilityService) => {
        return new JevClient({
          model: config.get<string>('JEV_MODEL', 'jev-latest'),
          timeoutMs: config.get<number>('JEV_TIMEOUT_MS', 5000),
          observability,
        });
      },
    },
    {
      provide: INTENT_CLASSIFIER,
      inject: [JevClient, ConfigService],
      useFactory: (jev: JevClient, config: ConfigService) => {
        return new JevIntentClassifier(jev, {
          minConfidence: config.get<number>('INTENT_MIN_CONFIDENCE', 0.6),
          minMargin: config.get<number>('INTENT_MIN_MARGIN', 0.15),
        });
      },
    },

    // 3. Capabilities, LLM & Tools
    CapabilityCheckService,
    GeminiService,
    QueryRewriter,
    SlotExtractor,
    ReplyWriter,
    ReadTool,

    // 4. The main agent service
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
