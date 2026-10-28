import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { AccountEntryModel, AccountEntryType } from '../models/account-entry';
import { firstValueFrom } from 'rxjs';

interface AccountEntryDto extends Omit<AccountEntryModel, 'id'> {
  _id: string;
}

const toAccountEntry = ({ _id, ...rest }: AccountEntryDto): AccountEntryModel => ({ ...rest, id: _id });

@Service()
export class AccountEntriesService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<AccountEntryModel[]>(() => '/api/account-entries', {
    defaultValue: [],
    parse: (raw) => (raw as AccountEntryDto[]).map(toAccountEntry),
  });

  readonly entries = this.resource.value;
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }

  async createEntry(name: string, type: AccountEntryType): Promise<AccountEntryModel> {
    const raw = await firstValueFrom(
      this.http.post<AccountEntryDto>('/api/account-entries', { name, type }),
    );
    this.reload();
    return toAccountEntry(raw);
  }

  async updateEntry(id: string, dto: { name?: string; type?: AccountEntryType }): Promise<AccountEntryModel> {
    const raw = await firstValueFrom(
      this.http.patch<AccountEntryDto>(`/api/account-entries/${id}`, dto),
    );
    this.reload();
    return toAccountEntry(raw);
  }

  async deleteEntry(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/account-entries/${id}`));
    this.reload();
  }
}
