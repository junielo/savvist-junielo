// TEMP: hardcoded UI data
import { ChatSession } from '../models/chat-session';
import { ChatMessage } from '../models/chat-message';

export const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 'session-1',
    title: 'Monthly budget check',
  },
  {
    id: 'session-2',
    title: 'Wishlist priorities',
  },
  {
    id: 'session-3',
    title: 'New chat',
  },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'session-1': [
    {
      id: 'msg-1-1',
      role: 'user',
      content: 'How much can I spend today across my categories?',
      status: 'complete',
    },
    {
      id: 'msg-1-2',
      role: 'assistant',
      content: 'Let me analyze your remaining monthly budget after subtracting fixed expenses and savings allocations.',
      status: 'complete',
    },
    {
      id: 'msg-1-3',
      role: 'user',
      content: 'What about dining out and groceries?',
      status: 'complete',
    },
    {
      id: 'msg-1-4',
      role: 'assistant',
      content: 'Your dining budget has ₱1,250 remaining for the rest of the week, while groceries are fully funded.',
      status: 'streaming',
    },
    {
      id: 'msg-1-5',
      role: 'user',
      content: 'Can you verify my bank sync status?',
      status: 'complete',
    },
    {
      id: 'msg-1-6',
      role: 'assistant',
      content: 'Unable to connect to financial institution API at the moment. Please check your credentials.',
      status: 'error',
    },
  ],
  'session-2': [
    {
      id: 'msg-2-1',
      role: 'user',
      content: 'Let us review the top wishlist priorities for this quarter.',
      status: 'complete',
    },
    {
      id: 'msg-2-2',
      role: 'assistant',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.',
      status: 'complete',
    },
    {
      id: 'msg-2-3',
      role: 'user',
      content: 'What is the highest priority item?',
      status: 'complete',
    },
    {
      id: 'msg-2-4',
      role: 'assistant',
      content: 'The ergonomic office chair is currently ranked #1 with 85% funding complete.',
      status: 'complete',
    },
    // Adding 26 more alternating messages to reach about 30 messages for scrolling check
    { id: 'msg-2-5', role: 'user', content: 'How much more do we need?', status: 'complete' },
    { id: 'msg-2-6', role: 'assistant', content: 'You need approximately ₱2,100 more to reach the goal.', status: 'complete' },
    { id: 'msg-2-7', role: 'user', content: 'Can we reallocate funds from entertainment?', status: 'complete' },
    { id: 'msg-2-8', role: 'assistant', content: 'Yes, transferring ₱1,500 from entertainment will get you very close.', status: 'complete' },
    { id: 'msg-2-9', role: 'user', content: 'Let us do that.', status: 'complete' },
    { id: 'msg-2-10', role: 'assistant', content: 'Reallocation scheduled successfully.', status: 'complete' },
    { id: 'msg-2-11', role: 'user', content: 'What is item #2?', status: 'complete' },
    { id: 'msg-2-12', role: 'assistant', content: 'Wireless noise-canceling headphones.', status: 'complete' },
    { id: 'msg-2-13', role: 'user', content: 'Target price?', status: 'complete' },
    { id: 'msg-2-14', role: 'assistant', content: '₱8,500.', status: 'complete' },
    { id: 'msg-2-15', role: 'user', content: 'Current saved amount?', status: 'complete' },
    { id: 'msg-2-16', role: 'assistant', content: '₱4,200 saved so far.', status: 'complete' },
    { id: 'msg-2-17', role: 'user', content: 'Nice progress.', status: 'complete' },
    { id: 'msg-2-18', role: 'assistant', content: 'Indeed! At current savings rates, you will reach it in 3 weeks.', status: 'complete' },
    { id: 'msg-2-19', role: 'user', content: 'What about item #3?', status: 'complete' },
    { id: 'msg-2-20', role: 'assistant', content: 'Mechanical keyboard upgrade.', status: 'complete' },
    { id: 'msg-2-21', role: 'user', content: 'Cost estimate?', status: 'complete' },
    { id: 'msg-2-22', role: 'assistant', content: '₱5,000.', status: 'complete' },
    { id: 'msg-2-23', role: 'user', content: 'Any funds allocated yet?', status: 'complete' },
    { id: 'msg-2-24', role: 'assistant', content: '₱1,000 allocated.', status: 'complete' },
    { id: 'msg-2-25', role: 'user', content: 'Let us bump allocation next month.', status: 'complete' },
    { id: 'msg-2-26', role: 'assistant', content: 'Added to monthly planning rule.', status: 'complete' },
    { id: 'msg-2-27', role: 'user', content: 'Are there any other items?', status: 'complete' },
    { id: 'msg-2-28', role: 'assistant', content: 'Two more minor items: desk mat and monitor light bar.', status: 'complete' },
    { id: 'msg-2-29', role: 'user', content: 'Sounds good, thanks for the summary.', status: 'complete' },
    { id: 'msg-2-30', role: 'assistant', content: 'You are welcome! Let me know if you need further adjustments.', status: 'complete' },
  ],
  'session-3': [],
};
