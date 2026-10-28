import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { ExpenseModel, CreateExpenseDto, UpdateExpenseDto } from '../models/expense.model';
import { firstValueFrom } from 'rxjs';

interface ExpenseDto extends Omit<ExpenseModel, 'id'> {
  _id: string;
}

const toExpense = ({ _id, ...rest }: ExpenseDto): ExpenseModel => ({ ...rest, id: _id });

@Service()
export class ExpenseService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<ExpenseModel[]>(() => '/api/expenses', {
    defaultValue: [],
    parse: (raw) => (raw as ExpenseDto[]).map(toExpense),
  });

  readonly expenses = this.resource.value;
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }

  async findAll(): Promise<ExpenseModel[]> {
    const raw = await firstValueFrom(
      this.http.get<ExpenseDto[]>('/api/expenses'),
    );
    return raw.map(toExpense);
  }

  async findOne(id: string): Promise<ExpenseModel> {
    const raw = await firstValueFrom(
      this.http.get<ExpenseDto>(`/api/expenses/${id}`),
    );
    return toExpense(raw);
  }

  async create(dto: CreateExpenseDto): Promise<ExpenseModel> {
    const raw = await firstValueFrom(
      this.http.post<ExpenseDto>('/api/expenses', dto),
    );
    this.reload();
    return toExpense(raw);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<ExpenseModel> {
    const raw = await firstValueFrom(
      this.http.patch<ExpenseDto>(`/api/expenses/${id}`, dto),
    );
    this.reload();
    return toExpense(raw);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/expenses/${id}`));
    this.reload();
  }

  // Alias methods matching common naming conventions
  async createExpense(dto: CreateExpenseDto): Promise<ExpenseModel> {
    return this.create(dto);
  }

  async updateExpense(id: string, dto: UpdateExpenseDto): Promise<ExpenseModel> {
    return this.update(id, dto);
  }

  async deleteExpense(id: string): Promise<void> {
    return this.remove(id);
  }
}
