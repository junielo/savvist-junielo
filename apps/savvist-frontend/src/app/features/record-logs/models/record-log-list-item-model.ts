export interface RecordLogListItemModel {
  id: string;
  name: string;
  amount: number;
  recordType: RecordType;
  date: Date;
}

export type RecordType = 'Expense' | 'Cash' | 'Savings' | 'Credit' | 'Wishlist';