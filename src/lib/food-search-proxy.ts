export const FOOD_SEARCH_AGENT = 'gym-app/0.1 (https://github.com/Renso0905/gym-app)';
export const FOOD_SEARCH_ORIGINS = ['https://world.openfoodfacts.org', 'https://us.openfoodfacts.org'] as const;

const FOOD_SEARCH_FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'image_small_url',
].join(',');

export function buildFoodSearchUpstreamUrls(requestUrl: string): URL[] | null {
  const incoming = new URL(requestUrl, 'https://gym-app.invalid');
  const query = incoming.searchParams.get('search_terms')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) return null;
  const requestedSize = Number.parseInt(incoming.searchParams.get('page_size') ?? '5', 10);
  const pageSize = Number.isFinite(requestedSize) ? Math.min(5, Math.max(1, requestedSize)) : 5;

  return FOOD_SEARCH_ORIGINS.map((origin) => {
    const upstream = new URL('/cgi/search.pl', origin);
    upstream.searchParams.set('search_terms', query);
    upstream.searchParams.set('search_simple', '1');
    upstream.searchParams.set('action', 'process');
    upstream.searchParams.set('json', '1');
    upstream.searchParams.set('page_size', String(pageSize));
    upstream.searchParams.set('fields', FOOD_SEARCH_FIELDS);
    return upstream;
  });
}
