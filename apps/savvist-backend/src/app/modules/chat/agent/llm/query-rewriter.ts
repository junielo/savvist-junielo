import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';
import { buildStandaloneQueryPrompt } from './prompts/standalone-query.prompt';
import { buildSecondaryQueryPrompt } from './prompts/secondary-query.prompt';
import { buildSplitQueriesPrompt } from './prompts/split-queries.prompt';
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

  /**
   * Extracts the secondary question or command from a compound confirmation message.
   */
  async extractSecondaryQuery(message: string): Promise<string> {
    const model = this.gemini.getModel();
    const prompt = buildSecondaryQueryPrompt(message);

    try {
      const response = await model.invoke(prompt);
      const raw = typeof response.content === 'string' ? response.content : String(response.content);
      const cleaned = raw.replace(/^["'`]|["'`]$/g, '').trim();

      this.observability?.setLLMCall('secondary-query-extractor', {
        message,
        extracted: cleaned,
      });

      return cleaned;
    } catch (err) {
      this.logger.error('Failed to extract secondary query with Gemini, using fallback', err);
      // Fallback: strip leading affirmation or denial
      const fallback = message
        .replace(
          /^(?:yes|yep|yeah|sure|confirm|proceed|ok|okay|no|nope|cancel|stop)(?:\s+please)?\s*[,;.-]?\s*(?:(?:and\s+also|and|also|but|instead|then)\s*[,;.-]?\s*)?/i,
          '',
        )
        .trim();
      return fallback;
    }
  }

  /**
   * Decomposes a potentially compound user prompt into individual queries in execution order.
   * If single-intent, returns [message].
   */
  async splitCompoundQueries(message: string): Promise<string[]> {
    if (!message || message.trim().length === 0) return [];

    // Fast check: if no conjunctions, return directly
    const hasConjunction = /\b(and also|and|then|also|plus)\b/i.test(message);
    if (!hasConjunction) {
      return [message.trim()];
    }

    const model = this.gemini.getModel();
    const prompt = buildSplitQueriesPrompt(message);

    try {
      const response = await model.invoke(prompt);
      const raw = typeof response.content === 'string' ? response.content : String(response.content);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const queries = parsed.map((q) => String(q).trim()).filter((q) => q.length > 0);
        this.observability?.setLLMCall('compound-query-splitter', {
          message,
          queries,
        });
        return queries.length > 0 ? queries : [message.trim()];
      }
    } catch (err) {
      this.logger.warn('Failed to parse split queries from Gemini, falling back to original message', err);
    }

    return [message.trim()];
  }
}
