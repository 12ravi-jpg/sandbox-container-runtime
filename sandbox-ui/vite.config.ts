import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to parse Vercel serverless /api folder locally
const vercelApiProxyPlugin = () => ({
  name: 'vercel-api-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api', async (req: any, res: any) => {
      try {
        const pathSplit = req.url.split('?')[0];
        // Ensure to clear cache so changes apply
        const modPath = Object.keys(require.cache).find(p => p.includes(pathSplit));
        if (modPath) delete require.cache[modPath];

        const modulePath = require('path').resolve('./api' + pathSplit + '.js');
        const handler = await import(modulePath + '?clear=' + Date.now()).then(m => m.default);
        
        // Setup rudimentary mock responses for Express-like Vercel format
        res.status = (code: number) => { res.statusCode = code; return res; };
        res.json = (data: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        
        // Accumulate Body
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', async () => {
          if (body) {
            try { req.body = JSON.parse(body); } catch(e) {}
          }
          await handler(req, res);
        });

      } catch (e) {
        console.error(e);
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Endpoint not found" }));
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), vercelApiProxyPlugin()],
})
