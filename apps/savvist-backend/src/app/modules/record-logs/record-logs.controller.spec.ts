import { Test, TestingModule } from '@nestjs/testing';
import { RecordLogsController } from './record-logs.controller';
import { RecordLogsService } from './record-logs.service';

describe('RecordLogsController', () => {
  let controller: RecordLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordLogsController],
      providers: [RecordLogsService],
    }).compile();

    controller = module.get<RecordLogsController>(RecordLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
