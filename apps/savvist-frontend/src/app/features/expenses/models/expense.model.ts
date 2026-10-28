export interface ExpenseModel {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  months: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseDto {
  name: string;
  amount: number;
  dayOfMonth: number;
  months: number[];
}

export interface UpdateExpenseDto {
  name?: string;
  amount?: number;
  dayOfMonth?: number;
  months?: number[];
}
