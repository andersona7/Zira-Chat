import geoip from 'geoip-lite';

export interface GeoInfo {
  country: string;
  region: string;
  city: string;
  timezone: string;
}

export const getGeoFromIP = (ip: string): GeoInfo => {
  // Handle local development/IPv6 loopback IPs
  let lookupIp = ip;
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    // Return mock or placeholder geo info for local environments
    return {
      country: 'US',
      region: 'CA',
      city: 'Localhost',
      timezone: 'America/Los_Angeles',
    };
  }

  // Strip IPv6 prefix if present in hybrid networks (e.g. ::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    lookupIp = ip.substring(7);
  }

  try {
    const geo = geoip.lookup(lookupIp);
    if (!geo) {
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      };
    }

    return {
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown',
      city: geo.city || 'Unknown',
      timezone: geo.timezone || 'UTC',
    };
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC',
    };
  }
};

export const maskIpAddress = (ip: string): string => {
  if (!ip) return 'unknown';
  if (ip.includes('.')) {
    // IPv4 masking e.g. 192.168.1.50 -> 192.168.***.***
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  } else if (ip.includes(':')) {
    // IPv6 masking e.g. 2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:0db8:****:****:****:****:****:****
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:${parts.slice(2).map(() => '****').join(':')}`;
    }
  }
  return '***.***.***.***';
};
