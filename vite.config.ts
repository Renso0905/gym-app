import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { handleFoodSearchRequest } from './src/lib/food-search-handler.ts';

const FOOD_SEARCH_PATH = '/api/food-search';

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
    server.middlewares.use(FOOD_SEARCH_PATH, async (request, response) => {
      try {
        const result = await handleFoodSearchRequest(new Request(new URL(request.url ?? '', 'http://localhost'), {
          method: request.method,
        }));
        response.statusCode = result.status;
        for (const header of ['Allow', 'Cache-Control', 'Content-Type', 'X-Content-Type-Options']) {
          const value = result.headers.get(header);
          if (value) response.setHeader(header, value);
        }
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
