import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EntryRecordModel } from '../models/account-entry';
import { firstValueFrom } from 'rxjs';

interface EntryRecordDto extends Omit<EntryRecordModel, 'id'> {
  _id: string;
}

const toEntryRecord = ({ _id, ...rest }: EntryRecordDto): EntryRecordModel => ({ ...rest, id: _id });

export interface FindEntryRecordsQuery {
  date?: string;
  day?: string;
  recordedDate?: string;
}

export interface UpdateBalanceDto {
  accountEntryId: string;
  day?: string;
  date?: string;
  balance: number;
  recordedDate?: string;
}

export interface DeleteBalanceQuery {
  accountEntryId?: string;
  day?: string;
  date?: string;
}

@Service()
export class EntryRecordsService {
  private readonly http = inject(HttpClient);

  async getRecords(query?: FindEntryRecordsQuery): Promise<EntryRecordModel[]> {
    let params = new HttpParams();
    if (query) {
      if (query.date) params = params.set('date', query.date);
      if (query.day) params = params.set('day', query.day);
      if (query.recordedDate) params = params.set('recordedDate', query.recordedDate);
    }
    const raw = await firstValueFrom(
      this.http.get<EntryRecordDto[]>('/api/entry-records', { params }),
    );
    return raw.map(toEntryRecord);
  }

  async updateBalance(dto: UpdateBalanceDto): Promise<EntryRecordModel> {
    const raw = await firstValueFrom(
      this.http.post<EntryRecordDto>('/api/entry-records', dto),
    );
    return toEntryRecord(raw);
  }

  async upsertAmount(dto: UpdateBalanceDto): Promise<EntryRecordModel> {
    const raw = await firstValueFrom(
      this.http.post<EntryRecordDto>('/api/entry-records/upsert', dto),
    );
    return toEntryRecord(raw);
  }

  async deleteBalanceById(id: string): Promise<{ deleted: boolean; id: string }> {
    const raw = await firstValueFrom(
      this.http.delete<{ deleted: boolean; _id: string }>(`/api/entry-records/${id}`),
    );
    return { deleted: raw.deleted, id: raw._id };
  }

  async deleteBalance(query: DeleteBalanceQuery): Promise<{ deleted: boolean; id: string }> {
    let params = new HttpParams();
    if (query.accountEntryId) params = params.set('accountEntryId', query.accountEntryId);
    if (query.day) params = params.set('day', query.day);
    if (query.date) params = params.set('date', query.date);

    const raw = await firstValueFrom(
      this.http.delete<{ deleted: boolean; _id: string }>('/api/entry-records', { params }),
    );
    return { deleted: raw.deleted, id: raw._id };
  }
}
