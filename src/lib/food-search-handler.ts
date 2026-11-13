import { buildFoodSearchUpstreamUrls, FOOD_SEARCH_AGENT } from './food-search-proxy.ts';

const json = (status: number, error: string, extra: Record<string, string> = {}) => new Response(JSON.stringify({ error }), {
  status,
  headers: {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  },
});

export async function handleFoodSearchRequest(request: Request, requestFn: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET') return json(405, 'Method not allowed', { Allow: 'GET' });
  const upstreams = buildFoodSearchUpstreamUrls(request.url);
  if (!upstreams) return json(400, 'Search query must be 2 to 80 characters');

  try {
    const search = (url: URL) => requestFn(url, {
      headers: { Accept: 'application/json', 'User-Agent': FOOD_SEARCH_AGENT },
    });
    let result = await search(upstreams[0]);
    if (result.status >= 500) result = await search(upstreams[1]);
    return new Response(result.body, {
      status: result.status,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': result.headers.get('content-type') ?? 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return json(502, 'Food search unavailable');
  }
}
