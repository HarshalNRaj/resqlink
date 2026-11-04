import type { Request, Response } from 'express';
import { app } from '../backend/server';

export default function handler(req: Request, res: Response): void {
  const requestUrl = req.url || '/';
  if (requestUrl !== '/api' && !requestUrl.startsWith('/api/')) {
    req.url = `/api${requestUrl.startsWith('/') ? '' : '/'}${requestUrl}`;
  }
  app(req, res);
}
