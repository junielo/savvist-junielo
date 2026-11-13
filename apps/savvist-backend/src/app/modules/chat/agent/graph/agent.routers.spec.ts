import { routeAfterClassify } from './agent.routers';

describe('agent.routers', () => {
  describe('routeAfterClassify', () => {
    it('routes to rewrite-query when isFollowUp is true for read/write/analysis intents', () => {
      const state = {
        intentResult: {
          intent: 'read_expenses',
          group: 'read',
          isFollowUp: true,
        },
      } as any;

      expect(routeAfterClassify(state)).toBe('rewrite-query');
    });

    it('routes directly to extract-slots when isFollowUp is false', () => {
      const state = {
        intentResult: {
          intent: 'read_expenses',
          group: 'read',
          isFollowUp: false,
        },
      } as any;

      expect(routeAfterClassify(state)).toBe('extract-slots');
    });

    it('routes non-domain intents directly to respond even if follow-up flag exists', () => {
      const state = {
        intentResult: {
          intent: 'thanks',
          group: 'non-domain',
          isFollowUp: true,
        },
      } as any;

      expect(routeAfterClassify(state)).toBe('respond');
    });
  });
});
