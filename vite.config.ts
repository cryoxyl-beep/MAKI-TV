import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/anizone-test') || req.url?.startsWith('/api/key-test')) {
              const urlObj = new URL(req.url, 'http://localhost');
              
              const vercelReq = req as any;
              vercelReq.query = Object.fromEntries(urlObj.searchParams);
              
              const vercelRes = res as any;
              vercelRes.status = (code: number) => {
                vercelRes.statusCode = code;
                return vercelRes;
              };
              vercelRes.json = (data: any) => {
                vercelRes.setHeader('Content-Type', 'application/json');
                vercelRes.end(JSON.stringify(data));
              };
              vercelRes.send = (data: any) => {
                vercelRes.end(data);
              };

              try {
                const modulePath = req.url.split('?')[0];
                const handler = await server.ssrLoadModule(`${modulePath}.ts`);
                await handler.default(vercelReq, vercelRes);
              } catch (err: any) {
                console.error('API Error:', err);
                if (!vercelRes.headersSent) {
                  vercelRes.status(500).json({ error: err.message || 'Internal Server Error' });
                }
              }
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
