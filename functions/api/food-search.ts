import { handleFoodSearchRequest } from '../../src/lib/food-search-handler.ts';

type PagesContext = { request: Request };

export async function onRequest({ request }: PagesContext): Promise<Response> {
  return handleFoodSearchRequest(request);
}
