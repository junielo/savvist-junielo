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

  it('should store nodes with nested llmCalls, toolCalls, and llmToolCalls and write to logs.json', () => {
    service.SetUserMessage('Check expenses');
    service.SetExecutedNode('read-data');
    service.SetLLMToolCall('getCurrentDate', { args: {}, result: { today: '2026-11-09' } });
    service.setLLMToolCall('getUpcomingExpenses', { args: { limit: 5 }, result: { count: 1 } });
    service.SetResponse('You have 1 upcoming expense.');

    expect(fs.existsSync(logFilePath)).toBe(true);
    const content = fs.readFileSync(logFilePath, 'utf-8');
    const logs = JSON.parse(content);

    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(1);

    const log = logs[0];
    expect(log.userMessage).toBe('Check expenses');
    expect(log.nodes).toEqual({
      'read-data': {
        toolCalls: [],
        llmCalls: [],
        llmToolCalls: [
          { name: 'getCurrentDate', value: { args: {}, result: { today: '2026-11-09' } } },
          { name: 'getUpcomingExpenses', value: { args: { limit: 5 }, result: { count: 1 } } }
        ]
      }
    });
    expect(log.response).toBe('You have 1 upcoming expense.');
  });
});
