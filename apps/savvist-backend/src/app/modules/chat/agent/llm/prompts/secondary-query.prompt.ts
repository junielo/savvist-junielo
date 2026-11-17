export function buildSecondaryQueryPrompt(message: string): string {
  return `You are a conversational query parser for a personal finance assistant.
The user was asked to confirm or deny an action, but they responded with a compound message that both responds to the confirmation AND asks an additional question or command.

Examples:
- "yes please and also, show me all the list of my expense" -> "show me all the list of my expense"
- "looks good, can you check my balance?" -> "can you check my balance?"
- "no, cancel that and tell me my upcoming bills" -> "tell me my upcoming bills"
- "sure thing! Also list my wishlist" -> "list my wishlist"

Extract ONLY the secondary question or command as a clean, standalone question.
Do NOT include the confirmation/denial words or pleasantries.
Do NOT add explanations, quotes, or markdown.
If there is no secondary question or command, return nothing.

User message: ${JSON.stringify(message)}`;
}
