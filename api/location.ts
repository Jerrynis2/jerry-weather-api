// ============================================================
// Vercel Serverless Function: Location Debug
// GET /api/location        — auto-detect IP and show geolocation
// GET /api/location?ip=x  — show geolocation for a specific IP
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeoLocationWithProvider, getClientIp } from '../lib/geolocation.js';
import type { ErrorResponse } from '../lib/types.js';

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).end();
    return;
  }

  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Use GET.',
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
    return;
  }

  try {
    const ipOverride = typeof req.query.ip === 'string' ? req.query.ip : undefined;
    const detectedIp = ipOverride || getClientIp(req.headers as any);
    const { location, provider } = await getGeoLocationWithProvider(
      req.headers as any,
      ipOverride
    );

    res.status(200).json({
      success: true,
      detectedIp,
      provider,
      location,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ErrorResponse);
  }
}
