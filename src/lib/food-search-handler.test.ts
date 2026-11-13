import { describe, expect, it, vi } from 'vitest';
import { handleFoodSearchRequest } from './food-search-handler';
import { FOOD_SEARCH_AGENT } from './food-search-proxy';

describe('food search server handler', () => {
  it('rejects unsupported methods and invalid queries before calling upstream', async () => {
    const request = vi.fn<typeof fetch>();
    expect((await handleFoodSearchRequest(new Request('https://gym.example/api/food-search', { method: 'POST' }), request)).status).toBe(405);
    expect((await handleFoodSearchRequest(new Request('https://gym.example/api/food-search?search_terms=a'), request)).status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it('identifies upstream requests and retries the US host after a server error', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"products":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const response = await handleFoodSearchRequest(
      new Request('https://gym.example/api/food-search?search_terms=apple&page_size=4'),
      request,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(request).toHaveBeenCalledTimes(2);
    expect(String(request.mock.calls[0][0])).toContain('world.openfoodfacts.org');
    expect(String(request.mock.calls[1][0])).toContain('us.openfoodfacts.org');
    expect(new Headers(request.mock.calls[0][1]?.headers).get('User-Agent')).toBe(FOOD_SEARCH_AGENT);
  });

  it('returns a safe gateway error when the upstream network fails', async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    const response = await handleFoodSearchRequest(
      new Request('https://gym.example/api/food-search?search_terms=apple'),
      request,
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Food search unavailable' });
  });
});
