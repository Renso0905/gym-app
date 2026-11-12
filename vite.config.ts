import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

const FOOD_SEARCH_PATH = '/api/food-search';
const FOOD_SEARCH_ORIGINS = ['https://world.openfoodfacts.org', 'https://us.openfoodfacts.org'];
const FOOD_SEARCH_AGENT = 'gym-app/0.1 (https://github.com/Renso0905/gym-app)';

type FoodApiServer = {
  middlewares: {
    use: (
      path: string,
      handler: (
        request: { method?: string; url?: string },
        response: {
          statusCode: number;
          setHeader: (name: string, value: string) => void;
          end: (body: string | Uint8Array) => void;
        },
        next: () => void,
      ) => void,
    ) => void;
  };
};

function foodSearchApi(): Plugin {
  const install = (server: FoodApiServer) => {
    server.middlewares.use(FOOD_SEARCH_PATH, async (request, response, next) => {
      if (request.method !== 'GET') {
        next();
        return;
      }

      try {
        const incoming = new URL(request.url ?? '', 'http://localhost');
        const requestSearch = (origin: string) => {
          const upstream = new URL('/cgi/search.pl', origin);
          incoming.searchParams.forEach((value, name) => upstream.searchParams.append(name, value));
          return fetch(upstream, {
            headers: { Accept: 'application/json', 'User-Agent': FOOD_SEARCH_AGENT },
          });
        };
        let result = await requestSearch(FOOD_SEARCH_ORIGINS[0]);
        if (result.status >= 500) result = await requestSearch(FOOD_SEARCH_ORIGINS[1]);
        response.statusCode = result.status;
        response.setHeader('Content-Type', result.headers.get('content-type') ?? 'application/json');
        response.end(new Uint8Array(await result.arrayBuffer()));
      } catch {
        response.statusCode = 502;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ error: 'Food search unavailable' }));
      }
    });
  };

  return {
    name: 'gym-app-food-search-api',
    configureServer: (server) => install(server as unknown as FoodApiServer),
    configurePreviewServer: (server) => install(server as unknown as FoodApiServer),
  };
}

export default defineConfig({
  plugins: [react(), foodSearchApi()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
