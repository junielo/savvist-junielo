import { Test, TestingModule } from '@nestjs/testing';
import { AIMessage } from '@langchain/core/messages';
import { AgentService } from './agent.service';
import { INTENT_CLASSIFIER } from './intent/intent-classifier.token';
import { CHECKPOINTER } from './persistence/mongo-checkpointer.provider';
import { ConfigService } from '@nestjs/config';
import { SlotExtractor } from './llm/slot-extractor';
import { QueryRewriter } from './llm/query-rewriter';
import { ReadTool } from './tools/read.tool';
import { ProductSearchService } from './tools/product-search.service';
import { WriteTool } from './tools/write.tool';
import { ReplyWriter } from './llm/reply-writer';
import { CapabilityCheckService } from './capabilities/capability-check.service';
import { ObservabilityService } from './observability/observability.service';
import { JevClient } from './intent/classifiers/jev.client';

describe('AgentService', () => {
  let service: AgentService;
  let mockJevClient: any;
  let mockQueryRewriter: any;

  beforeEach(async () => {
    mockJevClient = {
      resolveConfirmationResponse: jest.fn().mockResolvedValue({
        resolution: 'confirm',
        confidence: 0.98,
        hasSecondaryRequest: true,
      }),
    };
    mockQueryRewriter = {
      rewrite: jest.fn(),
      extractSecondaryQuery: jest.fn().mockResolvedValue('show me all the list of my expense'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: INTENT_CLASSIFIER, useValue: { classify: jest.fn() } },
        { provide: CHECKPOINTER, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: QueryRewriter, useValue: mockQueryRewriter },
        { provide: SlotExtractor, useValue: { extract: jest.fn() } },
        { provide: ReadTool, useValue: { getBalances: jest.fn() } },
        { provide: WriteTool, useValue: { updateBalance: jest.fn() } },
        { provide: ReplyWriter, useValue: { writeReply: jest.fn() } },
        { provide: CapabilityCheckService, useValue: { check: jest.fn().mockResolvedValue({ blocked: false, invalid: false }) } },
        { provide: JevClient, useValue: mockJevClient },
        { provide: ProductSearchService, useValue: { findProducts: jest.fn() } },
        ObservabilityService,
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run with compound confirmations', () => {
    it('chains Turn 1 (resume) and Turn 2 (follow-up) on compound confirmation', async () => {
      const graph = (service as any).graph;
      jest.spyOn(graph, 'getState').mockResolvedValue({
        next: ['confirm-first'],
        tasks: [{ interrupts: [{ pending_action: {} }] }],
      });

      const invokeSpy = jest.spyOn(graph, 'invoke');
      // Turn 1 returns write success
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Successfully updated expense "Maynilad".')],
        writeResult: { success: true, message: 'Successfully updated expense "Maynilad".' },
        intentResult: { intent: 'manage_expense' },
      });
      // Turn 2 returns read results
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Here are all your recorded expenses.')],
        intentResult: { intent: 'read_expenses' },
      });

      const res = await service.run({
        userId: '6adf58efb1a87dfd54b8d3a3',
        conversationId: 'conv-123',
        text: 'yes please and also, show me all the list of my expense',
      });

      expect(invokeSpy).toHaveBeenCalledTimes(2);
      expect(res.reply).toBe(
        'Successfully updated expense "Maynilad".\n\nHere are all your recorded expenses.',
      );
      expect(res.intent).toBe('read_expenses');
    });

    it('halts at Turn 1 when Turn 1 results in conflict or error', async () => {
      const graph = (service as any).graph;
      jest.spyOn(graph, 'getState').mockResolvedValue({
        next: ['confirm-first'],
        tasks: [{ interrupts: [{ pending_action: {} }] }],
      });

      const invokeSpy = jest.spyOn(graph, 'invoke');
      // Turn 1 encounters conflict
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('An existing balance is already recorded.')],
        pending_action: {
          conflict: { existingBalance: 30000, proposedBalance: 35000 },
        },
        intentResult: { intent: 'manage_entry_record' },
      });

      const res = await service.run({
        userId: '6adf58efb1a87dfd54b8d3a3',
        conversationId: 'conv-123',
        text: 'yes please and also, show me all the list of my expense',
      });

      expect(invokeSpy).toHaveBeenCalledTimes(1);
      expect(res.reply).toBe('An existing balance is already recorded.');
      expect(res.intent).toBe('manage_entry_record');
    });

    it('drains deferred queries carried over from turn 1 along with turn 2 follow-ups in parallel', async () => {
      const graph = (service as any).graph;
      jest.spyOn(graph, 'getState').mockResolvedValue({
        next: ['confirm-first'],
        tasks: [{ interrupts: [{ pending_action: {} }] }],
        values: {
          queued_queries: ['display all expenses'],
        },
      });

      mockQueryRewriter.extractSecondaryQuery.mockResolvedValueOnce('show all my wishlist as well');

      const invokeSpy = jest.spyOn(graph, 'invoke');
      // Turn 1 write
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Successfully updated expense "Meralco".')],
        writeResult: { success: true },
        intentResult: { intent: 'manage_expense' },
      });
      // Queued query 1 (expenses)
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Here are your expenses.')],
      });
      // Queued query 2 (wishlist)
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Here are your wishlist items.')],
      });

      const res = await service.run({
        userId: '6adf58efb1a87dfd54b8d3a3',
        conversationId: 'conv-123',
        text: 'yes please and also, show all my wishlist as well',
      });

      expect(invokeSpy).toHaveBeenCalledTimes(3);
      expect(res.reply).toContain('Successfully updated expense "Meralco".');
      expect(res.reply).toContain('Here are your expenses.');
      expect(res.reply).toContain('Here are your wishlist items.');
    });
  });

  describe('run with fresh compound queries', () => {
    it('decomposes multiple read queries in a fresh turn and runs them in parallel', async () => {
      const graph = (service as any).graph;
      jest.spyOn(graph, 'getState').mockResolvedValue({
        next: [],
        tasks: [],
      });

      mockQueryRewriter.splitCompoundQueries = jest
        .fn()
        .mockResolvedValue([
          'show me all my expenses',
          'show all my wishlist items that I haven’t bought yet',
        ]);

      const invokeSpy = jest.spyOn(graph, 'invoke');
      // Query 1
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Here are all your expenses.')],
        intentResult: { intent: 'read_expenses' },
      });
      // Query 2
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Here are your active wishlist items.')],
        intentResult: { intent: 'read_wishlist' },
      });

      const res = await service.run({
        userId: '6adf58efb1a87dfd54b8d3a3',
        conversationId: 'conv-123',
        text: 'show me all my expenses and all my wishlist items that I haven’t bought yet',
      });

      expect(invokeSpy).toHaveBeenCalledTimes(2);
      expect(res.reply).toBe(
        'Here are all your expenses.\n\nHere are your active wishlist items.',
      );
    });

    it('pauses at confirmation when the first query in a compound prompt prepares a write action and stashes remaining queries', async () => {
      const graph = (service as any).graph;
      jest.spyOn(graph, 'getState').mockResolvedValue({
        next: [],
        tasks: [],
      });

      mockQueryRewriter.splitCompoundQueries = jest
        .fn()
        .mockResolvedValue(['Update Meralco bill amount to 4500', 'display all expenses']);

      const invokeSpy = jest.spyOn(graph, 'invoke');
      // Query 1 prepares an action
      invokeSpy.mockResolvedValueOnce({
        messages: [new AIMessage('Would you like to update Meralco to 4500? Reply yes or no.')],
        pending_action: { tool: 'update_expense' },
        intentResult: { intent: 'manage_expense' },
      });

      const res = await service.run({
        userId: '6adf58efb1a87dfd54b8d3a3',
        conversationId: 'conv-123',
        text: 'Update Meralco bill amount to 4500 then display all expenses',
      });

      expect(invokeSpy).toHaveBeenCalledTimes(1);
      expect(invokeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queued_queries: ['display all expenses'],
        }),
        expect.anything(),
      );
      expect(res.reply).toContain('Would you like to update Meralco to 4500?');
    });
  });
});
