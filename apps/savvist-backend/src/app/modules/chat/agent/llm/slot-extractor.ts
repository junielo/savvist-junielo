/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';
import { WishlistQueryArgs } from '../../../wishlist/wishlist-query';
import { buildSlotExtractorPrompt } from './prompts/slot-extractor.prompt';

// Used only to validate the model's JSON. It is NOT sent to Gemini.
export const SlotSchema = z.object({
  searchName: z.string().nullish().transform((v) => v ?? null),
  month: z.number().int().min(1).max(12).nullish().transform((v) => v ?? null),
  limit: z.number().int().min(1).nullish().transform((v) => v ?? null),
  accountName: z.string().nullish().transform((v) => v ?? null),
  standaloneQuery: z.string().nullish().transform((v) => v ?? ''),
  readArgs: WishlistQueryArgs.nullish().transform((v) => v ?? null),
  incomplete: z.boolean().optional().default(false),
});

export type ExtractedSlots = z.infer<typeof SlotSchema>;

export interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

const parseJson = (raw: string): unknown => {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

@Injectable()
export class SlotExtractor {
  private readonly logger = new Logger(SlotExtractor.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly observability?: ObservabilityService,
  ) {}

  async extract(
    message: string,
    history?: string | HistoryMessage[],
    intent?: string,
  ): Promise<ExtractedSlots> {
    const model = this.gemini.getModel();
    const isWishlist = intent === 'read_wishlist';

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

    const prompt = buildSlotExtractorPrompt({
      message,
      historyText,
      intent,
    });

    let text = '';
    try {
      const response = await model.invoke(prompt);
      text = typeof response.content === 'string' ? response.content : String(response.content);
      const raw = parseJson(text) as any;
      const parsed = SlotSchema.safeParse(raw);
      if (!parsed.success) {
        this.logger.warn(`Slot extraction validation warning: ${JSON.stringify(parsed.error.issues)}`);
        const fallback: ExtractedSlots = {
          searchName: null,
          month: null,
          limit: null,
          accountName: null,
          standaloneQuery: message,
          readArgs: null,
          incomplete: false,
        };
        this.observability?.setLLMCall('slot-extractor', {
          message,
          history,
          intent,
          rawOutput: text,
          validationIssues: parsed.error.issues,
          result: fallback,
        });
        return fallback;
      }
      let slots = parsed.data;
      if (!slots.standaloneQuery) {
        slots.standaloneQuery = message;
      }
      if (isWishlist && slots.readArgs) {
        const validateArgs = WishlistQueryArgs.safeParse(slots.readArgs);
        if (!validateArgs.success) {
          this.logger.warn(`WishlistQueryArgs validation warning: ${JSON.stringify(validateArgs.error.issues)}`);
          slots = { ...slots, readArgs: null, incomplete: false };
        } else {
          slots = { ...slots, readArgs: validateArgs.data };
        }
      }
      this.observability?.setLLMCall('slot-extractor', { message, history, intent, result: slots });
      return slots;
    } catch (err) {
      this.logger.error('Failed to extract slots', err);
      const fallback: ExtractedSlots = {
        searchName: null,
        month: null,
        limit: null,
        accountName: null,
        standaloneQuery: message,
        readArgs: null,
        incomplete: false,
      };
      this.observability?.setLLMCall('slot-extractor', {
        message,
        history,
        intent,
        rawOutput: text,
        error: String(err),
        result: fallback,
      });
      return fallback;
    }
  }
}
