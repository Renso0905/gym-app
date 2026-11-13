import { describe, expect, it } from 'vitest';
import { buildFoodSearchUrl, foodSearchResultDraft, parseFoodSearchResponse, searchFoods } from './food-search';

describe('Open Food Facts search URL', () => {
  it('builds a same-origin submit-based search', () => {
    const url = new URL(buildFoodSearchUrl('  greek yogurt  ', 5), 'https://gym.example');
    expect(url.pathname).toBe('/api/food-search');
    expect(url.searchParams.get('search_terms')).toBe('greek yogurt');
    expect(url.searchParams.get('page_size')).toBe('5');
  });

  it('keeps the page size within the public search limit used by the app', () => {
    expect(new URL(buildFoodSearchUrl('apple', 0), 'https://gym.example').searchParams.get('page_size')).toBe('1');
    expect(new URL(buildFoodSearchUrl('apple', 100), 'https://gym.example').searchParams.get('page_size')).toBe('5');
  });
});

describe('Open Food Facts request handling', () => {
  it('returns parsed foods from a successful request', async () => {
    const request = async () => new Response(JSON.stringify({
      products: [{ code: '1', product_name: 'Apple', nutriments: { 'energy-kcal_100g': 52 } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await expect(searchFoods('apple', undefined, request)).resolves.toMatchObject([{ name: 'Apple', calories: 52 }]);
  });

  it('explains rate limits and network failures', async () => {
    const limited = async () => new Response('', { status: 429 });
    const offline = async (): Promise<Response> => { throw new TypeError('Failed to fetch'); };
    await expect(searchFoods('apple', undefined, limited)).rejects.toThrow('Too many searches');
    await expect(searchFoods('apple', undefined, offline)).rejects.toThrow('Could not reach the food database');
  });
});

describe('search result logging', () => {
  it('creates a log-ready draft with the brand and tracked nutrients', () => {
    expect(foodSearchResultDraft({
      id: '123',
      name: 'Greek Yogurt',
      brand: 'Example Dairy',
      basis: '170 g',
      calories: 120,
      protein: 20,
      fiber: 1,
      carbohydrates: 8,
      fat: 2.5,
      sourceUrl: 'https://world.openfoodfacts.org/product/123',
    })).toEqual({
      name: 'Greek Yogurt — Example Dairy',
      calories: 120,
      protein: 20,
      fiber: 1,
    });
  });
});

describe('Open Food Facts response parsing', () => {
  it('uses explicit per-serving nutrition and keeps useful extra nutrients', () => {
    const [food] = parseFoodSearchResponse({
      products: [{
        code: '123',
        product_name: 'Greek Yogurt',
        brands: 'Example Dairy',
        serving_size: '1 cup (170 g)',
        serving_quantity: 170,
        image_small_url: 'https://images.example/yogurt.jpg',
        nutriments: {
          'energy-kcal_serving': 120,
          proteins_serving: 20,
          fiber_serving: 1,
          carbohydrates_serving: 8,
          fat_serving: 2.5,
        },
      }],
    });
    expect(food).toEqual({
      id: '123',
      name: 'Greek Yogurt',
      brand: 'Example Dairy',
      basis: '1 cup (170 g)',
      calories: 120,
      protein: 20,
      fiber: 1,
      carbohydrates: 8,
      fat: 2.5,
      imageUrl: 'https://images.example/yogurt.jpg',
      sourceUrl: 'https://world.openfoodfacts.org/product/123',
    });
  });

  it('calculates a serving from per-100g data when serving values are absent', () => {
    const [food] = parseFoodSearchResponse({
      products: [{
        code: '456',
        product_name: 'Oats',
        serving_quantity: '40',
        nutriments: {
          'energy-kcal_100g': 380,
          proteins_100g: 12.5,
          fiber_100g: 10,
          carbohydrates_100g: 60,
          fat_100g: 7,
        },
      }],
    });
    expect(food).toMatchObject({ basis: '40 g serving', calories: 152, protein: 5, fiber: 4, carbohydrates: 24, fat: 2.8 });
  });

  it('falls back to 100g and converts kilojoules when calories are absent', () => {
    const [food] = parseFoodSearchResponse({
      products: [{ code: '789', generic_name: 'Apple', nutriments: { 'energy-kj_100g': 218, proteins_100g: 0.3 } }],
    });
    expect(food).toMatchObject({ name: 'Apple', basis: '100 g', calories: 52.1, protein: 0.3 });
  });

  it('skips damaged products, unsafe images and duplicate barcodes', () => {
    const foods = parseFoodSearchResponse({
      products: [
        null,
        { code: '1', product_name: '', nutriments: { 'energy-kcal_100g': 10 } },
        { code: '2', product_name: 'No calories', nutriments: {} },
        { code: '3', product_name: 'Valid', image_small_url: 'http://unsafe.example/image.jpg', nutriments: { 'energy-kcal_100g': 50 } },
        { code: '3', product_name: 'Duplicate', nutriments: { 'energy-kcal_100g': 60 } },
      ],
    });
    expect(foods).toHaveLength(1);
    expect(foods[0]).toMatchObject({ id: '3', name: 'Valid', calories: 50 });
    expect(foods[0]).not.toHaveProperty('imageUrl');
    expect(parseFoodSearchResponse({ products: 'bad' })).toEqual([]);
  });
});
