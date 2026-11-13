import { describe, expect, it } from 'vitest';
import { buildFoodSearchUpstreamUrls, FOOD_SEARCH_ORIGINS } from './food-search-proxy';

describe('food search proxy policy', () => {
  it('builds identified upstream searches on the global and US hosts', () => {
    const urls = buildFoodSearchUpstreamUrls('/api/food-search?search_terms=greek%20yogurt&page_size=4')!;
    expect(urls.map((url) => url.origin)).toEqual([...FOOD_SEARCH_ORIGINS]);
    for (const url of urls) {
      expect(url.pathname).toBe('/cgi/search.pl');
      expect(url.searchParams.get('search_terms')).toBe('greek yogurt');
      expect(url.searchParams.get('page_size')).toBe('4');
      expect(url.searchParams.get('fields')).toContain('nutriments');
    }
  });

  it('rejects unusable queries and clamps result counts', () => {
    expect(buildFoodSearchUpstreamUrls('/api/food-search?search_terms=a')).toBeNull();
    expect(buildFoodSearchUpstreamUrls(`/api/food-search?search_terms=${'x'.repeat(81)}`)).toBeNull();
    expect(buildFoodSearchUpstreamUrls('/api/food-search?search_terms=apple&page_size=999')?.[0].searchParams.get('page_size')).toBe('5');
  });

  it('ignores caller attempts to override controlled Open Food Facts parameters', () => {
    const [url] = buildFoodSearchUpstreamUrls('/api/food-search?search_terms=apple&action=delete&fields=password&page_size=-3')!;
    expect(url.searchParams.get('action')).toBe('process');
    expect(url.searchParams.get('fields')).not.toContain('password');
    expect(url.searchParams.get('page_size')).toBe('1');
  });
});
