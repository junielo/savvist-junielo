import { Test, TestingModule } from '@nestjs/testing';
import { AccountEntriesController } from './account-entries.controller';
import { AccountEntriesService } from './account-entries.service';

describe('AccountEntriesController', () => {
  let controller: AccountEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountEntriesController],
      providers: [AccountEntriesService],
    }).compile();

    controller = module.get<AccountEntriesController>(AccountEntriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
