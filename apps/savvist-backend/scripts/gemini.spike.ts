import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import * as z from 'zod';

const model = new ChatGoogleGenerativeAI({
  model: process.env['GEMINI_MODEL']!, // pick a current model id from Google's model list
  temperature: 0,
});

const Slots = z.object({
  account: z.string().optional().describe('Account name, if stated'),
  amount: z.number().optional().describe('Balance amount, if stated'),
  targetDay: z.string().optional().describe('YYYY-MM-DD, if stated'),
});

async function main() {
  const structured = model.withStructuredOutput(Slots, { method: 'jsonSchema' });
  const today = '2026-11-03'; // Asia/Manila
  const result = await structured.invoke(
    `Today is ${today}. Extract slots from: "Set BDO to 5,000 yesterday"`,
  );
  console.log(result);
}
main();