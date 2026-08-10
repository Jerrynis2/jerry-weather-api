// ============================================================
// Vercel Serverless Function: Health Check
// GET /api/health
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'JerryWeatherAPI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? `${process.uptime().toFixed(1)}s` : undefined,
  });
}
