import { Test, TestingModule } from '@nestjs/testing';
import { ObservabilityService } from './observability.service';
import * as fs from 'fs';
import * as path from 'path';

describe('ObservabilityService', () => {
  let service: ObservabilityService;
  const logFilePath = path.join(__dirname, 'logs.json');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObservabilityService],
    }).compile();

    service = module.get<ObservabilityService>(ObservabilityService);

    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should store nodes with nested llmCalls and toolCalls and write to logs.json', () => {
    service.SetUserMessage('Hello AI');
    service.SetExecutedNode('classify-intent');
    service.SetLLMCall('jev-classifier', { intent: 'greeting', confidence: 0.95 });
    service.SetLLMCall('jev-classifier-2', { intent: 'greeting' });
    
    service.SetExecutedNode('read-data');
    service.SetToolCall('read-tool', { query: 'users' });

    service.SetResponse('Hello! How can I help you?');

    expect(fs.existsSync(logFilePath)).toBe(true);
    const content = fs.readFileSync(logFilePath, 'utf-8');
    const logs = JSON.parse(content);

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);

    const log = logs[0];
    expect(log.userMessage).toBe('Hello AI');
    expect(log.nodes).toEqual({
      'classify-intent': {
        toolCalls: [],
        llmCalls: [
          { name: 'jev-classifier', value: { intent: 'greeting', confidence: 0.95 } },
          { name: 'jev-classifier-2', value: { intent: 'greeting' } }
        ]
      },
      'read-data': {
        toolCalls: [
          { name: 'read-tool', value: { query: 'users' } }
        ],
        llmCalls: []
      }
    });
    expect(log.response).toBe('Hello! How can I help you?');
  });
});
