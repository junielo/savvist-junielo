import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// import * as z from 'zod';

const model = new ChatGoogleGenerativeAI({
  model: process.env['GEMINI_MODEL']!, // pick a current model id from Google's model list
  temperature: 0,
});

// const Slots = z.object({
//   account: z.string().optional().describe('Account name, if stated'),
//   amount: z.number().optional().describe('Balance amount, if stated'),
//   targetDay: z.string().optional().describe('YYYY-MM-DD, if stated'),
// });

async function main() {
  const today = '2026-11-09'; // Asia/Manila
  const messages = [
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage(`Today is ${today}. How many days until 2026-12-15?`),
  ];
  try {
    // 3. Invoke the model to obtain the response
    const response = await model.invoke(messages);
    
    // 4. Output the raw text content
    console.log(response.content);
  } catch (error) {
    console.error("Error generating completion:", error);
  }
}
main();