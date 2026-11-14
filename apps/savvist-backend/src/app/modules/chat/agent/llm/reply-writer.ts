import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';
import { buildReplyPrompt } from './prompts/reply.prompt';

@Injectable()
export class ReplyWriter {
  private readonly logger = new Logger(ReplyWriter.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly observability?: ObservabilityService,
  ) { }

  async writeReply(intent: string, readResult: unknown, question: string): Promise<string> {
    const model = this.gemini.getModel();
    const prompt = buildReplyPrompt({ intent, readResult, question });

    try {
      const response = await model.invoke(prompt);
      let reply = typeof response.content === 'string' ? response.content : String(response.content);
      reply = reply.replace(/^(hello|hi|hey)[,!.]?\s*(i['’]?m|i am)\s+savvist[!.]?\s*/i, '').trim();
      this.observability?.setLLMCall('reply-writer', { intent, question, reply });
      return reply;
    } catch (err) {
      this.logger.error('Failed to generate reply', err);
      return 'Here is the information you requested based on your records.';
    }
  }
}
