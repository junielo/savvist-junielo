export function buildSplitQueriesPrompt(message: string): string {
  return `You are a conversational query parser for a personal finance assistant.
Analyze the user's message to determine if it contains multiple distinct requests or actions (e.g. joined by "and", "then", "also", "and also", or separated into multiple sentences).

Rules:
1. If the message contains only a single request or statement, return a JSON array with just the original message.
2. If the message contains multiple distinct requests (e.g. "Update Meralco bill amount to 4500 then display all expenses", "show my expenses and list my wishlist"), decompose them into clean, self-contained, standalone query strings in execution order.
3. Do NOT split single multi-item statements or batch updates (e.g. recording balances for multiple accounts in the same entry like "set my today's BDO amount is still 4000 and for the GCredit is 17000", "Today, my BDO is 45k and GCredit is 11k", "Add Rent 15,000 and PLDT 1899"). Keep these as a single unified request so they can be processed together.
4. Output ONLY a valid JSON array of strings (e.g. ["query 1", "query 2"]). No markdown, no commentary, no explanation.

Examples:
- "show me all my expenses and all my wishlist items that I haven't bought yet" -> ["show me all my expenses", "show all my wishlist items that I haven't bought yet"]
- "Update Meralco bill amount to 4500 then display all expenses" -> ["Update Meralco bill amount to 4500", "display all expenses"]
- "set my today's BDO amount is 4000 and for GCredit is 17000" -> ["set my today's BDO amount is 4000 and for GCredit is 17000"]
- "how much is my rent?" -> ["how much is my rent?"]

User message: ${JSON.stringify(message)}`;
}
