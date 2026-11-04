import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { JevClient } from './intent/classifiers/jev.client';
import { JevIntentClassifier } from './intent/classifiers/jev.classifier';
import { mongoCheckpointerProvider } from './persistence/mongo-checkpointer.provider';

@Module({
  imports: [ConfigModule],
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

    // 3. The service that needs both of the above
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}