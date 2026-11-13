import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { CHECKPOINTER } from './persistence/mongo-checkpointer.provider';
import { ConfigService } from '@nestjs/config';
import { SlotExtractor } from './llm/slot-extractor';
import { QueryRewriter } from './llm/query-rewriter';
import { ReadTool } from './tools/read.tool';
import { ReplyWriter } from './llm/reply-writer';
import { CapabilityCheckService } from './capabilities/capability-check.service';
import { ObservabilityService } from './observability/observability.service';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: INTENT_CLASSIFIER, useValue: { classify: jest.fn() } },
        { provide: CHECKPOINTER, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: QueryRewriter, useValue: { rewrite: jest.fn() } },
        { provide: SlotExtractor, useValue: { extract: jest.fn() } },
        { provide: ReadTool, useValue: { getBalances: jest.fn() } },
        { provide: ReplyWriter, useValue: { writeReply: jest.fn() } },
        { provide: CapabilityCheckService, useValue: { check: jest.fn().mockResolvedValue({ blocked: false, invalid: false }) } },
        ObservabilityService,
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
