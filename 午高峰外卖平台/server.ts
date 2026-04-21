import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const { AppModule } = await import('./apps/api/src/app.module.ts');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  // Get express instance from Nest BEFORE init
  const server = app.getHttpAdapter().getInstance();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  // Custom Catch-all routing for SPAs
  const renderSPA = async (req: express.Request, res: express.Response, htmlPath: string) => {
    try {
      const url = req.originalUrl;
      const absolutePath = path.resolve(__dirname, htmlPath);
      let template = fs.readFileSync(absolutePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      res.status(500).end(e.message);
    }
  };

  // 1. Mount Vite middlewares only for non-API routes
  server.use((req: any, res: any, next: any) => {
    if (req.originalUrl.startsWith('/api')) {
      next();
    } else {
      vite.middlewares(req, res, next);
    }
  });

  // 2. Mount Merchant SPA
  server.get(/^\/merchant(\/.*)?$/, (req: any, res: any, next: any) => {
    if (req.originalUrl.startsWith('/api')) return next();
    renderSPA(req, res, 'apps/merchant-web/index.html');
  });

  // 3. Mount Customer SPA (fallback)
  server.get(/(.*)/, (req: any, res: any, next: any) => {
    if (req.originalUrl.startsWith('/api')) return next();
    renderSPA(req, res, 'apps/customer-h5/index.html');
  });

  // 4. Init Nest endpoints & its 404 handler AFTER frontend routes
  await app.init();

  server.listen(3000, () => {
    console.log('Unified Server running on port 3000');
  });
}

bootstrap();
