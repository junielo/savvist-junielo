import { Test, TestingModule } from '@nestjs/testing';
import { EntryRecordsController } from './entry-records.controller';
import { EntryRecordsService } from './entry-records.service';

describe('EntryRecordsController', () => {
  let controller: EntryRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntryRecordsController],
      providers: [EntryRecordsService],
    }).compile();

    controller = module.get<EntryRecordsController>(EntryRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
