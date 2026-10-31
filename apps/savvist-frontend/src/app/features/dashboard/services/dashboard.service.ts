import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DailyMetricDto {
  _id: string;
  userId: string;
  day: string;
  totalFund: number;
  actualCash: number;
  health: number;
  growth: number;
  createdAt?: string | Date;
  updatedAt?: Date;
}

export interface DailyMetricModel {
  id: string;
  userId: string;
  day: string;
  totalFund: number;
  actualCash: number;
  health: number;
  growth: number;
  createdAt?: string | Date;
  updatedAt?: Date;
}

export const toDailyMetricModel = (dto: DailyMetricDto): DailyMetricModel => ({
  id: dto._id,
  userId: dto.userId,
  day: dto.day,
  totalFund: dto.totalFund,
  actualCash: dto.actualCash,
  health: dto.health,
  growth: dto.growth,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

@Service()
export class DashboardService {
  private readonly http = inject(HttpClient);

  // Summary / Latest metric resource
  private readonly summaryResource = httpResource<DailyMetricModel | null>(() => '/api/dashboard/summary', {
    defaultValue: null,
    parse: (raw) => (raw ? toDailyMetricModel(raw as DailyMetricDto) : null),
  });

  // Trend resource (last 30 days)
  private readonly trendResource = httpResource<DailyMetricModel[]>(() => '/api/dashboard/trend', {
    defaultValue: [],
    parse: (raw) => (raw as DailyMetricDto[]).map(toDailyMetricModel),
  });

  readonly summary = this.summaryResource.value;
  readonly isLoadingSummary = this.summaryResource.isLoading;
  readonly summaryError = this.summaryResource.error;

  readonly trend = this.trendResource.value;
  readonly isLoadingTrend = this.trendResource.isLoading;
  readonly trendError = this.trendResource.error;

  reload(): void {
    this.summaryResource.reload();
    this.trendResource.reload();
  }

  async getLatest(): Promise<DailyMetricModel | null> {
    const raw = await firstValueFrom(this.http.get<DailyMetricDto | null>('/api/dashboard/summary'));
    return raw ? toDailyMetricModel(raw) : null;
  }

  async getTrend(limit?: number): Promise<DailyMetricModel[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit);
    }
    const raw = await firstValueFrom(this.http.get<DailyMetricDto[]>('/api/dashboard/trend', { params }));
    return raw.map(toDailyMetricModel);
  }

  async computeAndSaveForDay(day: string): Promise<DailyMetricModel> {
    const raw = await firstValueFrom(
      this.http.post<DailyMetricDto>('/api/daily-metrics/compute', { day }),
    );
    this.reload();
    return toDailyMetricModel(raw);
  }

  // Aliases mirroring DailyMetricsService & Dashboard endpoints
  async computeAndSave(day: string): Promise<DailyMetricModel> {
    return this.computeAndSaveForDay(day);
  }

  async getSummary(): Promise<DailyMetricModel | null> {
    return this.getLatest();
  }
}
