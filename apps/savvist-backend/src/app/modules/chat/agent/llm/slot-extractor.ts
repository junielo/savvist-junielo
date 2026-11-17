/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { GeminiService } from './gemini.service';
import { ObservabilityService } from '../observability/observability.service';
import { WishlistQueryArgs } from '../../../wishlist/wishlist-query';
import { buildSlotExtractorPrompt } from './prompts/slot-extractor.prompt';

export const BalanceEntrySchema = z.object({
  accountName: z.string().trim().min(1),
  amount: z.number().positive(),
});

export type BalanceEntry = z.infer<typeof BalanceEntrySchema>;

export const ExpenseEntrySchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().positive(),
  dayOfMonth: z.number().int().min(1).max(31).nullish().transform((v) => v ?? null),
  months: z.array(z.number().int().min(1).max(12)).optional().default([]),
});

export type ExpenseEntry = z.infer<typeof ExpenseEntrySchema>;

export const ExpenseUpdateSchema = z.object({
  targetName: z.string().trim().min(1),
  newName: z.string().trim().min(1).nullish().transform((v) => v ?? null),
  amount: z.number().positive().nullish().transform((v) => v ?? null),
  dayOfMonth: z.number().int().min(1).max(31).nullish().transform((v) => v ?? null),
  months: z
    .array(z.number().int().min(1).max(12))
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;

// Used only to validate the model's JSON. It is NOT sent to Gemini.
export const SlotSchema = z.object({
  searchName: z.string().nullish().transform((v) => v ?? null),
  month: z.number().int().min(1).max(12).nullish().transform((v) => v ?? null),
  limit: z.number().int().min(1).nullish().transform((v) => v ?? null),
  accountName: z.string().nullish().transform((v) => v ?? null),
  amount: z.number().positive().nullish().transform((v) => v ?? null),
  baseSalary: z.number().min(0).nullish().transform((v) => v ?? null),
  isUnemployed: z.boolean().nullish().transform((v) => v ?? null),
  entries: z.array(BalanceEntrySchema).nullish().transform((v) => v ?? null),
  expenses: z.array(ExpenseEntrySchema).nullish().transform((v) => v ?? null),
  updateExpense: ExpenseUpdateSchema.nullish().transform((v) => v ?? null),
  date: z.string().nullish().transform((v) => v ?? null),
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
    today?: string,
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
      today,
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
          amount: null,
          baseSalary: null,
          isUnemployed: null,
          entries: null,
          expenses: null,
          updateExpense: null,
          date: null,
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

      // Normalize entries: if multiple entries present, set primary accountName/amount
      if (slots.entries && slots.entries.length > 0) {
        if (!slots.accountName) slots.accountName = slots.entries[0].accountName;
        if (!slots.amount) slots.amount = slots.entries[0].amount;
      } else if (slots.accountName && slots.amount) {
        slots.entries = [{ accountName: slots.accountName, amount: slots.amount }];
      }

      // Normalize expenses: if single searchName + amount given, or if expenses provided
      if (slots.expenses && slots.expenses.length > 0) {
        if (!slots.searchName) slots.searchName = slots.expenses[0].name;
        if (!slots.amount) slots.amount = slots.expenses[0].amount;
      } else if (intent === 'manage_expense') {
        const candidateName = slots.searchName ?? slots.accountName;
        if (candidateName && slots.amount) {
          slots.expenses = [
            {
              name: candidateName,
              amount: slots.amount,
              dayOfMonth: null,
              months: [],
            },
          ];
        }
      }

      // If managing expenses, infer dayOfMonth from "today" if applicable, then check completeness
      if (intent === 'manage_expense') {
        if (slots.updateExpense) {
          if (!slots.searchName) {
            slots.searchName = slots.updateExpense.targetName;
          }
          const hasUpdateField =
            Boolean(slots.updateExpense.newName) ||
            slots.updateExpense.amount !== null ||
            slots.updateExpense.dayOfMonth !== null ||
            (slots.updateExpense.months && slots.updateExpense.months.length > 0);

          if (!slots.updateExpense.targetName || !hasUpdateField) {
            slots.incomplete = true;
          } else {
            slots.incomplete = false;
          }
        } else if (slots.expenses && slots.expenses.length > 0) {
          if (today && (slots.date === 'today' || slots.date === today)) {
            const todayDay = parseInt(today.split('-')[2], 10);
            if (!isNaN(todayDay) && todayDay >= 1 && todayDay <= 31) {
              slots.expenses = slots.expenses.map((e) =>
                e.dayOfMonth === null ? { ...e, dayOfMonth: todayDay } : e,
              );
            }
          }

          const hasIncompleteExpense = slots.expenses.some(
            (e) => !e.name || !e.amount || e.dayOfMonth === null || e.dayOfMonth < 1 || e.dayOfMonth > 31,
          );
          if (hasIncompleteExpense) {
            slots.incomplete = true;
          }
        } else {
          slots.incomplete = true;
        }
      }

      // If managing balance entry, mark incomplete if no entries found
      if (intent === 'manage_entry_record') {
        if (!slots.entries || slots.entries.length === 0) {
          slots.incomplete = true;
        }
      }

      // If updating base salary or employment status
      if (intent === 'update_base_salary') {
        if (slots.amount !== null && slots.baseSalary === null) {
          slots.baseSalary = slots.amount;
        }
        if (slots.isUnemployed === true) {
          slots.baseSalary = 0;
        }
        if (slots.baseSalary === null && slots.isUnemployed === null) {
          slots.incomplete = true;
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
        amount: null,
        baseSalary: null,
        isUnemployed: null,
        entries: null,
        expenses: null,
        updateExpense: null,
        date: null,
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
