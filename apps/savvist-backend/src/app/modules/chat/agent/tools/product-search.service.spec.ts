/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ProductSearchService,
  parseNumber,
  numbersIn,
  findJsonLdProducts,
  factsFromOgs,
} from './product-search.service';
import { ObservabilityService } from '../observability/observability.service';

describe('ProductSearchService', () => {
  let service: ProductSearchService;
  let mockConfig: { get: jest.Mock };

  beforeEach(async () => {
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'GOOGLE_API_KEY') return 'mock-api-key';
        if (key === 'GEMINI_MODEL') return 'mock-gemini-model';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSearchService,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: ObservabilityService,
          useValue: { SetLLMToolCall: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProductSearchService>(ProductSearchService);
  });

  describe('helper functions', () => {
    it('parseNumber parses numbers from various currency formats', () => {
      expect(parseNumber('1,299.00')).toBe(1299);
      expect(parseNumber('₱4,999')).toBe(4999);
      expect(parseNumber('$350')).toBe(350);
      expect(parseNumber(2500)).toBe(2500);
      expect(parseNumber('')).toBeNull();
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber(undefined)).toBeNull();
    });

    it('numbersIn extracts all numbers from text', () => {
      const text = 'Items range from ₱2,000 to 4500 and one at 999.50';
      const nums = numbersIn(text);
      expect(nums).toEqual([2000, 4500, 999.5]);
    });

    it('findJsonLdProducts extracts products from JSON-LD graph or array', () => {
      const jsonLd = {
        '@graph': [
          { '@type': 'WebSite', name: 'Store' },
          { '@type': 'Product', name: 'Mechanical Keyboard' },
        ],
      };
      const found = findJsonLdProducts(jsonLd);
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('Mechanical Keyboard');
    });

    it('factsFromOgs extracts name, brand, and prices', () => {
      const ogsResult = {
        ogTitle: 'Keychron K2 Keyboard',
        jsonLD: [
          {
            '@type': 'Product',
            name: 'Keychron K2',
            brand: 'Keychron',
            offers: [{ price: '3,800.00' }],
          },
        ],
        customMetaTags: {
          priceAmount: '3800',
        },
      };

      const facts = factsFromOgs(ogsResult, 'https://example.com/product');
      expect(facts.url).toBe('https://example.com/product');
      expect(facts.name).toBe('Keychron K2');
      expect(facts.brand).toBe('Keychron');
      expect(facts.prices).toContain(3800);
    });
  });

  describe('findProducts', () => {
    it('returns structured search results and corroborates prices', async () => {
      jest.spyOn(service as any, 'getLLM').mockReturnValue({} as any);

      jest.spyOn(service, 'groundedSearch').mockResolvedValue({
        text: 'Found Keychron K2 keyboard at 3800 and Royal Kludge at 2500.',
        sources: [{ title: 'Store 1', url: 'https://store1.com/k2' }],
        queries: ['keyboard 2000 to 4000'],
      });

      jest.spyOn(service, 'extractItems').mockResolvedValue({
        items: [
          { name: 'Keychron K2', brand: 'Keychron', price: { value: 3800, currency: 'PHP' } },
          { name: 'Royal Kludge RK61', brand: 'Royal Kludge', price: { value: 2500, currency: 'PHP' } },
          { name: 'Unverified Board', brand: 'Generic', price: { value: 99999, currency: 'PHP' } },
        ],
      } as any);

      const result = await service.findProducts('keyboard 2000 to 4000', { count: 3 });

      expect(result.query).toBe('keyboard 2000 to 4000');
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({
        name: 'Keychron K2',
        brand: 'Keychron',
        description: null,
        price: { value: 3800, currency: 'PHP' },
      });
      expect(result.items[1]).toEqual({
        name: 'Royal Kludge RK61',
        brand: 'Royal Kludge',
        description: null,
        price: { value: 2500, currency: 'PHP' },
      });
      // 99999 was not in source text or facts, so price is null
      expect(result.items[2].price).toBeNull();
      expect(result.warnings.some((w) => w.includes('price for "Unverified Board" not found'))).toBe(true);
    });

    it('caps requested count at maxItems (20)', async () => {
      jest.spyOn(service as any, 'getLLM').mockReturnValue({} as any);
      jest.spyOn(service, 'groundedSearch').mockResolvedValue({
        text: 'Summary',
        sources: [],
        queries: [],
      });
      jest.spyOn(service, 'extractItems').mockResolvedValue({ items: [] } as any);

      const result = await service.findProducts('cheap mice', { count: 50 });
      expect(result.requestedCount).toBe(20);
      expect(result.warnings.some((w) => w.includes('capped at 20'))).toBe(true);
    });

    it('handles search failure gracefully without throwing', async () => {
      jest.spyOn(service as any, 'getLLM').mockReturnValue({} as any);
      jest.spyOn(service, 'groundedSearch').mockRejectedValue(new Error('Network offline'));

      const result = await service.findProducts('running shoes');
      expect(result.error).toBe('Network offline');
      expect(result.items).toEqual([]);
      expect(result.summary).toBe('');
    });
  });
});
