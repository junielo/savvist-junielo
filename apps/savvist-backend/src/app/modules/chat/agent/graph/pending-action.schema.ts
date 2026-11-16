import { z } from 'zod';

export const ConflictItemSchema = z.object({
  existingBalance: z.number(),
  proposedBalance: z.number(),
  accountName: z.string(),
  day: z.string(),
});

export type ConflictItem = z.infer<typeof ConflictItemSchema>;

export const PendingActionSchema = z.object({
  id: z.string().optional(),
  tool: z.string(),
  intent: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  args: z.record(z.string(), z.unknown()),
  description: z.string(),
  confirmedReplace: z.boolean().optional().default(false),
  conflict: z
    .union([ConflictItemSchema, z.array(ConflictItemSchema)])
    .optional()
    .nullable(),
  resolution: z
    .enum(['confirm', 'deny', 'cancel', 'correction', 'new_request'])
    .optional()
    .nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type PendingAction = z.infer<typeof PendingActionSchema>;
