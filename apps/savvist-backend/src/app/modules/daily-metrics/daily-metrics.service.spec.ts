import { Test, TestingModule } from '@nestjs/testing';
import { DailyMetricsService } from './daily-metrics.service';

describe('DailyMetricsService', () => {
  let service: DailyMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyMetricsService],
    }).compile();

    service = module.get<DailyMetricsService>(DailyMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
