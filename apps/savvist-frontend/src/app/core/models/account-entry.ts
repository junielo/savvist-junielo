export type AccountEntryType = 'cash' | 'credit' | 'savings';

export interface AccountEntryModel {
  id: string;
  userId: string;
  name: string;
  type: AccountEntryType;
  archivedAt?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntryRecordModel {
  id: string;
  userId: string;
  accountEntryId: string;
  day: string;
  balance: number;
  accountName: string;
  accountType: AccountEntryType;
  recordedDate: string;
  createdAt: string;
  updatedAt: string;
}
