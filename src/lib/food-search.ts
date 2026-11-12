// R20: read-only Open Food Facts search. Search is submit-based because the
// public service limits search requests; this module also treats every field
// as untrusted because the database is community maintained.

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  basis: string;
  calories: number;
  protein?: number;
  fiber?: number;
  carbohydrates?: number;
  fat?: number;
  imageUrl?: string;
  sourceUrl: string;
}

const FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments',
  'image_small_url',
].join(',');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean === '' ? undefined : clean;
};

const amount = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number < 0) return undefined;
  return Math.round(number * 100) / 100;
};

export function buildFoodSearchUrl(query: string, pageSize = 6, sameOrigin = import.meta.env.DEV): string {
  const url = new URL('https://us.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query.trim());
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(Math.min(20, Math.max(1, Math.floor(pageSize)))));
  url.searchParams.set('fields', FIELDS);
  return sameOrigin ? `/api/food-search?${url.searchParams.toString()}` : url.toString();
}

function scaled(nutriments: Record<string, unknown>, nutrient: string, servingQuantity: number | undefined): number | undefined {
  const perServing = amount(nutriments[`${nutrient}_serving`]);
  if (perServing !== undefined) return perServing;
  const per100 = amount(nutriments[`${nutrient}_100g`]);
  if (per100 === undefined || servingQuantity === undefined) return per100;
  return Math.round(per100 * servingQuantity) / 100;
}

function calories(nutriments: Record<string, unknown>, servingQuantity: number | undefined): number | undefined {
  const kcalServing = amount(nutriments['energy-kcal_serving']);
  if (kcalServing !== undefined) return kcalServing;
  const kcal100 = amount(nutriments['energy-kcal_100g']);
  const kj100 = amount(nutriments['energy-kj_100g']);
  const per100 = kcal100 ?? (kj100 === undefined ? undefined : Math.round((kj100 / 4.184) * 100) / 100);
  if (per100 === undefined || servingQuantity === undefined) return per100;
  return Math.round(per100 * servingQuantity) / 100;
}

function parseProduct(raw: unknown): FoodSearchResult | null {
  if (!isRecord(raw)) return null;
  const id = text(raw.code);
  const name = text(raw.product_name) ?? text(raw.generic_name);
  const nutriments = isRecord(raw.nutriments) ? raw.nutriments : {};
  const parsedServing = amount(raw.serving_quantity);
  const servingQuantity = parsedServing !== undefined && parsedServing > 0 ? parsedServing : undefined;
  const energy = calories(nutriments, servingQuantity);
  if (!id || !name || energy === undefined) return null;

  const servingSize = text(raw.serving_size);
  const result: FoodSearchResult = {
    id,
    name,
    basis: servingQuantity !== undefined ? servingSize ?? `${servingQuantity} g serving` : '100 g',
    calories: energy,
    sourceUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(id)}`,
  };
  const brand = text(raw.brands);
  const imageUrl = text(raw.image_small_url);
  if (brand) result.brand = brand;
  if (imageUrl?.startsWith('https://')) result.imageUrl = imageUrl;

  const nutrients: Array<[keyof Pick<FoodSearchResult, 'protein' | 'fiber' | 'carbohydrates' | 'fat'>, string]> = [
    ['protein', 'proteins'],
    ['fiber', 'fiber'],
    ['carbohydrates', 'carbohydrates'],
    ['fat', 'fat'],
  ];
  for (const [key, nutrient] of nutrients) {
    const value = scaled(nutriments, nutrient, servingQuantity);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/** Valid, deduplicated products that have at least a name and calories. */
export function parseFoodSearchResponse(raw: unknown): FoodSearchResult[] {
  if (!isRecord(raw) || !Array.isArray(raw.products)) return [];
  const seen = new Set<string>();
  return raw.products
    .map(parseProduct)
    .filter((product) => product !== null)
    .filter((product) => (seen.has(product.id) ? false : (seen.add(product.id), true)));
}

export async function searchFoods(query: string, signal?: AbortSignal, request: typeof fetch = fetch): Promise<FoodSearchResult[]> {
  let response: Response;
  try {
    response = await request(buildFoodSearchUrl(query), { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach the food database. Check your connection and try again.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new Error('Too many searches. Wait a minute and try again.');
    throw new Error('The food database is temporarily unavailable.');
  }
  return parseFoodSearchResponse(await response.json());
}
