import { Test, TestingModule } from '@nestjs/testing';
import { AccountEntriesService } from './account-entries.service';

describe('AccountEntriesService', () => {
  let service: AccountEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountEntriesService],
    }).compile();

    service = module.get<AccountEntriesService>(AccountEntriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
