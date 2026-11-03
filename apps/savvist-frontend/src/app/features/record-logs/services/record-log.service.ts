import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RecordLogListItemModel, RecordType } from '../models/record-log-list-item-model';

export interface RecordLogDto {
  _id: string;
  userId: string;
  name: string;
  amount: number;
  recordType: string;
  action: string;
  date: string | Date;
  sourceCollection: string;
  sourceId: string;
  previousAmount?: number;
  effectiveDay?: string;
  createdAt?: string | Date;
}

const mapRecordType = (type: string): RecordType => {
  const lower = type?.toLowerCase();
  if (lower === 'expense') return 'Expense';
  if (lower === 'cash') return 'Cash';
  if (lower === 'savings') return 'Savings';
  if (lower === 'credit') return 'Credit';
  if (lower === 'wishlist') return 'Wishlist';
  return (type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()) as RecordType;
};

const toRecordLogModel = (dto: RecordLogDto): RecordLogListItemModel => ({
  id: dto._id,
  name: dto.name,
  amount: dto.amount,
  recordType: mapRecordType(dto.recordType),
  date: new Date(dto.date || dto.createdAt || Date.now()),
});

@Service()
export class RecordLogService {
  private readonly http = inject(HttpClient);

  private readonly resource = httpResource<RecordLogListItemModel[]>(() => '/api/record-logs', {
    defaultValue: [],
    parse: (raw) => (raw as RecordLogDto[]).map(toRecordLogModel),
  });

  readonly recordLogs = this.resource.value;
  readonly isLoading = this.resource.isLoading;
  readonly error = this.resource.error;

  reload(): void {
    this.resource.reload();
  }

  async findAll(): Promise<RecordLogListItemModel[]> {
    const raw = await firstValueFrom(
      this.http.get<RecordLogDto[]>('/api/record-logs'),
    );
    return raw.map(toRecordLogModel);
  }
}
