// ============================================================
// IP Geolocation Module
// ============================================================

import type { GeoLocation } from './types.js';

/**
 * Check if an IP is private/localhost.
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '0.0.0.0' ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('fc') ||
    ip.startsWith('fe80')
  );
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, standard reverse proxies, and local development.
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const headerKeys = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-vercel-forwarded-for',
    'cf-connecting-ip',
  ];

  for (const key of headerKeys) {
    const value = headers[key];
    if (value) {
      const ip = String(value).split(',')[0].trim();
      if (ip && ip !== 'unknown') return ip;
    }
  }

  return '127.0.0.1';
}

/**
 * Get the public IP address when running locally (IP is localhost).
 * Uses api.ipify.org (free, HTTPS, no key).
 */
async function getPublicIp(): Promise<string | null> {
  try {
    const resp = await fetch('https://api.ipify.org?format=json');
    if (resp.ok) {
      const data = await resp.json() as any;
      if (data.ip) return data.ip;
    }
  } catch (e) {
    console.error('ipify failed:', e);
  }
  return null;
}

/**
 * Try to get geolocation from Vercel's built-in headers.
 */
function getGeoFromVercelHeaders(
  headers: Record<string, string | string[] | undefined>,
  ip: string
): GeoLocation | null {
  const lat = headers['x-vercel-ip-latitude'];
  const lon = headers['x-vercel-ip-longitude'];
  if (!lat || !lon) return null;

  const latitude = parseFloat(String(lat));
  const longitude = parseFloat(String(lon));
  if (isNaN(latitude) || isNaN(longitude)) return null;

  return {
    ip,
    city: decodeVercelHeader(headers['x-vercel-ip-city']) || 'Unknown',
    region: decodeVercelHeader(headers['x-vercel-ip-country-region']) || '',
    country: decodeVercelHeader(headers['x-vercel-ip-country']) || '',
    countryCode: decodeVercelHeader(headers['x-vercel-ip-country']) || '',
    latitude,
    longitude,
    timezone: decodeVercelHeader(headers['x-vercel-ip-timezone']) || 'auto',
  };
}

function decodeVercelHeader(value: string | string[] | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

/**
 * Get geolocation from ip-api.com (free, HTTP on free tier).
 * Better accuracy for Chinese city-level IPs.
 */
async function getGeoFromIpApiCom(ip: string): Promise<GeoLocation | null> {
  const queryIp = isPrivateIp(ip) ? '' : ip;
  const url = `http://ip-api.com/json/${queryIp}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,query`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json() as any;
  if (data.status !== 'success') return null;

  return {
    ip: data.query || ip,
    city: data.city || 'Unknown',
    region: data.regionName || '',
    country: data.country || '',
    countryCode: data.countryCode || '',
    latitude: data.lat,
    longitude: data.lon,
    timezone: data.timezone || 'auto',
    isp: data.isp || undefined,
  };
}

/**
 * Get geolocation from ipinfo.io (free, HTTPS, no API key for 50k req/month).
 * Good accuracy for Chinese IPs. Returns IPv4-based location (more accurate than IPv6).
 */
async function getGeoFromIpInfo(ip: string): Promise<GeoLocation | null> {
  const queryIp = isPrivateIp(ip) ? '' : `${ip}/json`;
  const url = `https://ipinfo.io/${queryIp}/json`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json() as any;
  if (!data.ip || !data.loc) return null;

  const [lat, lon] = data.loc.split(',').map((v: string) => parseFloat(v));
  if (isNaN(lat) || isNaN(lon)) return null;

  return {
    ip: data.ip,
    city: data.city || 'Unknown',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country || '',
    latitude: lat,
    longitude: lon,
    timezone: data.timezone || 'auto',
    isp: data.org || undefined,
  };
}

/**
 * Get geolocation from ipwho.is (free, HTTPS, no API key).
 */
async function getGeoFromIpWhoIs(ip: string): Promise<GeoLocation | null> {
  const queryIp = isPrivateIp(ip) ? '' : ip;
  const url = `https://ipwho.is/${queryIp}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json() as any;
  if (!data.success) return null;

  return {
    ip: data.ip || ip,
    city: data.city || 'Unknown',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country_code || '',
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone?.id || 'auto',
    isp: data.connection?.isp || undefined,
  };
}

export interface GeoLocationResult {
  location: GeoLocation;
  provider: string;
}

/**
 * Get geolocation for an IP address.
 * Strategy:
 *   1. Check Vercel headers (fastest, no external call)
 *   2. Try ip-api.com (better Chinese city accuracy, HTTP)
 *   3. Try ipinfo.io (HTTPS, good Chinese accuracy)
 *   4. Try ipwho.is (HTTPS, works everywhere)
 * If the detected IP is localhost/private, first resolve the public IP.
 */
export async function getGeoLocation(
  headers: Record<string, string | string[] | undefined>,
  ipOverride?: string
): Promise<GeoLocation> {
  let ip = ipOverride || getClientIp(headers);

  // If IP is private/localhost, try to resolve the real public IP
  if (isPrivateIp(ip)) {
    const publicIp = await getPublicIp();
    if (publicIp) {
      ip = publicIp;
    }
  }

  // 1. Try Vercel headers (only available on Vercel deployment)
  const vercelGeo = getGeoFromVercelHeaders(headers, ip);
  if (vercelGeo) return vercelGeo;

  // 2. Try ip-api.com first (better for Chinese IPs, HTTP)
  try {
    const geo = await getGeoFromIpApiCom(ip);
    if (geo) return geo;
  } catch (e) {
    console.error('ip-api.com failed:', e);
  }

  // 3. Try ipinfo.io (HTTPS, good Chinese accuracy)
  try {
    const geo = await getGeoFromIpInfo(ip);
    if (geo) return geo;
  } catch (e) {
    console.error('ipinfo.io failed:', e);
  }

  // 4. Try ipwho.is
  try {
    const geo = await getGeoFromIpWhoIs(ip);
    if (geo) return geo;
  } catch (e) {
    console.error('ipwho.is failed:', e);
  }

  throw new Error('Unable to determine geolocation from IP address. All geolocation providers failed.');
}

/**
 * Get geolocation with provider info (for debugging).
 */
export async function getGeoLocationWithProvider(
  headers: Record<string, string | string[] | undefined>,
  ipOverride?: string
): Promise<GeoLocationResult> {
  let ip = ipOverride || getClientIp(headers);

  if (isPrivateIp(ip)) {
    const publicIp = await getPublicIp();
    if (publicIp) ip = publicIp;
  }

  // 1. Vercel headers
  const vercelGeo = getGeoFromVercelHeaders(headers, ip);
  if (vercelGeo) return { location: vercelGeo, provider: 'vercel-headers' };

  // 2. ip-api.com
  try {
    const geo = await getGeoFromIpApiCom(ip);
    if (geo) return { location: geo, provider: 'ip-api.com' };
  } catch (e) {
    console.error('ip-api.com failed:', e);
  }

  // 3. ipinfo.io
  try {
    const geo = await getGeoFromIpInfo(ip);
    if (geo) return { location: geo, provider: 'ipinfo.io' };
  } catch (e) {
    console.error('ipinfo.io failed:', e);
  }

  // 4. ipwho.is
  try {
    const geo = await getGeoFromIpWhoIs(ip);
    if (geo) return { location: geo, provider: 'ipwho.is' };
  } catch (e) {
    console.error('ipwho.is failed:', e);
  }

  throw new Error('Unable to determine geolocation from IP address. All geolocation providers failed.');
}
