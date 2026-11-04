import type { Request, Response } from 'express';
import { app } from '../backend/server';

export default function handler(req: Request, res: Response): void {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const apiPath = requestUrl.searchParams.get('__path');

  if (apiPath !== null) {
    requestUrl.searchParams.delete('__path');
    const path = apiPath.split('/').filter(Boolean).join('/');
    req.url = `${path ? `/api/${path}` : '/api'}${requestUrl.search}`;
  } else if (!requestUrl.pathname.startsWith('/api')) {
    req.url = `/api${requestUrl.pathname}${requestUrl.search}`;
  }

  app(req, res);
}
