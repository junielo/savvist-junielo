import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';
import { buildStandaloneQueryPrompt } from './prompts/standalone-query.prompt';
import type { HistoryMessage } from './slot-extractor';

@Injectable()
export class QueryRewriter {
  private readonly logger = new Logger(QueryRewriter.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly observability?: ObservabilityService,
  ) {}

  async rewrite(
    message: string,
    history?: string | HistoryMessage[],
  ): Promise<string> {
    const model = this.gemini.getModel();

    const formatHistory = (h?: string | HistoryMessage[]): string => {
      if (!h) return 'none';
      if (typeof h === 'string') return `Assistant: ${JSON.stringify(h)}`;
      if (Array.isArray(h) && h.length > 0) {
        return h
          .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${JSON.stringify(item.text)}`)
          .join('\n');
      }
      return 'none';
    };

    const historyText = formatHistory(history);
    const prompt = buildStandaloneQueryPrompt({ message, historyText });

    try {
      const response = await model.invoke(prompt);
      const raw = typeof response.content === 'string' ? response.content : String(response.content);
      const cleaned = raw.replace(/^["'`]|["'`]$/g, '').trim();
      const result = cleaned || message;

      this.observability?.setLLMCall('query-rewriter', {
        message,
        history,
        rewritten: result,
      });

      return result;
    } catch (err) {
      this.logger.error('Failed to rewrite query, falling back to original message', err);
      this.observability?.setLLMCall('query-rewriter', {
        message,
        history,
        error: String(err),
        rewritten: message,
      });
      return message;
    }
  }
}
