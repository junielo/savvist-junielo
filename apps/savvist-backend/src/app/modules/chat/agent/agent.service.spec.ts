import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { CHECKPOINTER } from './persistence/mongo-checkpointer.provider';
import { ConfigService } from '@nestjs/config';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: INTENT_CLASSIFIER, useValue: { classify: jest.fn() } },
        { provide: CHECKPOINTER, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
