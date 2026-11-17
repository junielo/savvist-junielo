import { JevClient } from './jev.client';
import { TypeSafeClassifier } from '@langchain/typesafe';

jest.mock('@langchain/typesafe');

describe('JevClient', () => {
  let jevClient: JevClient;
  let mockInvoke: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke = jest.fn();
    (TypeSafeClassifier as unknown as jest.Mock).mockImplementation(() => ({
      invoke: mockInvoke,
    }));
    jevClient = new JevClient();
  });

  describe('resolveEntityMatch', () => {
    it('returns null if query or candidates are empty', async () => {
      const res1 = await jevClient.resolveEntityMatch('', [{ name: 'water' }]);
      expect(res1.matched).toBeNull();

      const res2 = await jevClient.resolveEntityMatch('water', []);
      expect(res2.matched).toBeNull();
    });

    it('returns exact match immediately with 1.0 confidence without calling model', async () => {
      const candidates = [
        { id: '1', name: 'water' },
        { id: '2', name: 'meralco' },
      ];
      const res = await jevClient.resolveEntityMatch('water', candidates);
      expect(res.matched).toEqual(candidates[0]);
      expect(res.confidence).toBe(1.0);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('uses Jev to semantically match when not an exact match', async () => {
      const candidates = [
        { id: '1', name: 'water' },
        { id: '2', name: 'meralco' },
      ];
      mockInvoke.mockResolvedValueOnce({
        choices: {
          matched_item: { choice: 'water', confidence: 0.95 },
        },
        nouls: {
          matches_any: { noul: 0.92 },
        },
      });

      const res = await jevClient.resolveEntityMatch('water bill', candidates);
      expect(res.matched).toEqual(candidates[0]);
      expect(res.confidence).toBe(0.92);
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('returns null if companion noul indicates no match (< 0.4)', async () => {
      const candidates = [
        { id: '1', name: 'rent' },
        { id: '2', name: 'wifi' },
      ];
      mockInvoke.mockResolvedValueOnce({
        choices: {
          matched_item: { choice: 'rent', confidence: 0.5 },
        },
        nouls: {
          matches_any: { noul: 0.1 },
        },
      });

      const res = await jevClient.resolveEntityMatch('car insurance', candidates);
      expect(res.matched).toBeNull();
      expect(res.confidence).toBe(0.1);
    });

    it('falls back to substring matching if Jev throws an error', async () => {
      const candidates = [
        { id: '1', name: 'water' },
        { id: '2', name: 'meralco' },
      ];
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));

      const res = await jevClient.resolveEntityMatch('water bill', candidates);
      expect(res.matched).toEqual(candidates[0]);
      expect(res.confidence).toBe(0.6);
    });
  });

  describe('checkSemanticPolicy', () => {
    it('returns isProhibited: true when noul >= 0.7', async () => {
      mockInvoke.mockResolvedValueOnce({
        nouls: {
          prohibited_advice_or_topic: { noul: 0.85 },
        },
      });

      const res = await jevClient.checkSemanticPolicy('Should I invest in crypto?');
      expect(res.isProhibited).toBe(true);
      expect(res.probability).toBe(0.85);
    });
  });

  describe('resolveConfirmationResponse', () => {
    it('detects compound confirmation with secondary request', async () => {
      mockInvoke.mockResolvedValueOnce({
        choices: {
          confirmation_intent: { choice: 'confirm', confidence: 0.98 },
        },
        nouls: {
          has_secondary_request: { noul: 0.95 },
        },
      });

      const res = await jevClient.resolveConfirmationResponse(
        'yes please and also, show me all the list of my expense',
        'Record 35000 for BDO?',
      );
      expect(res.resolution).toBe('confirm');
      expect(res.hasSecondaryRequest).toBe(true);
      expect(res.confidence).toBe(0.98);
    });

    it('returns hasSecondaryRequest: false for simple confirmation', async () => {
      mockInvoke.mockResolvedValueOnce({
        choices: {
          confirmation_intent: { choice: 'confirm', confidence: 0.99 },
        },
        nouls: {
          has_secondary_request: { noul: 0.05 },
        },
      });

      const res = await jevClient.resolveConfirmationResponse('yes please');
      expect(res.resolution).toBe('confirm');
      expect(res.hasSecondaryRequest).toBe(false);
    });

    it('identifies corrections and denials', async () => {
      mockInvoke.mockResolvedValueOnce({
        choices: {
          confirmation_intent: { choice: 'correction', confidence: 0.92 },
        },
        nouls: {
          has_secondary_request: { noul: 0.1 },
        },
      });

      const res = await jevClient.resolveConfirmationResponse('no wait, make it 4000');
      expect(res.resolution).toBe('correction');
      expect(res.hasSecondaryRequest).toBe(false);
    });

    it('corrects new_request to confirm when user opened with an affirmation and hasSecondaryRequest is true', async () => {
      mockInvoke.mockResolvedValueOnce({
        choices: {
          confirmation_intent: { choice: 'new_request', confidence: 0.87 },
        },
        nouls: {
          has_secondary_request: { noul: 0.98 },
        },
      });

      const res = await jevClient.resolveConfirmationResponse(
        'yes please and also show me my wishlist including I already purchased items',
        'Would you like to update water to Maynilad?',
      );
      expect(res.resolution).toBe('confirm');
      expect(res.hasSecondaryRequest).toBe(true);
    });
  });

  describe('checkCompoundConfirmation', () => {
    it('delegates to resolveConfirmationResponse correctly', async () => {
      mockInvoke.mockResolvedValueOnce({
        choices: {
          confirmation_intent: { choice: 'confirm', confidence: 0.98 },
        },
        nouls: {
          has_secondary_request: { noul: 0.95 },
        },
      });

      const res = await jevClient.checkCompoundConfirmation(
        'yes please and also, show me all the list of my expense',
      );
      expect(res.isConfirmationOrDenial).toBe(true);
      expect(res.hasSecondaryRequest).toBe(true);
    });
  });
});
