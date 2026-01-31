import crypto from 'crypto';

/**
 * Generate a unique visitor ID (vid)
 */
export function generateVisitorId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a unique session ID (sid)
 */
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash sensitive data (email, phone) for privacy
 */
export function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

/**
 * Hash a secret (case-sensitive) for secure storage/compare.
 * We store hashes (not plaintext) in DB and compare incoming webhook secrets by hashing.
 */
export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

/**
 * Extract device type from user agent
 */
export function getDeviceType(userAgent: string): string {
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Extract browser from user agent
 */
export function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

/**
 * Extract OS from user agent
 */
export function getOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

/**
 * Parse UTM parameters from URL
 */
export function parseUTMParams(url: string): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
} {
  const urlObj = new URL(url);
  return {
    utm_source: urlObj.searchParams.get('utm_source') || undefined,
    utm_medium: urlObj.searchParams.get('utm_medium') || undefined,
    utm_campaign: urlObj.searchParams.get('utm_campaign') || undefined,
    utm_content: urlObj.searchParams.get('utm_content') || undefined,
    utm_term: urlObj.searchParams.get('utm_term') || undefined,
  };
}

/**
 * Parse click IDs from URL
 */
export function parseClickIds(url: string): {
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
  msclkid?: string;
  sccid?: string;
} {
  const urlObj = new URL(url);
  return {
    fbclid: urlObj.searchParams.get('fbclid') || undefined,
    ttclid: urlObj.searchParams.get('ttclid') || undefined,
    gclid: urlObj.searchParams.get('gclid') || undefined,
    wbraid: urlObj.searchParams.get('wbraid') || undefined,
    gbraid: urlObj.searchParams.get('gbraid') || undefined,
    msclkid: urlObj.searchParams.get('msclkid') || undefined,
    sccid: urlObj.searchParams.get('sccid') || undefined,
  };
}

/**
 * Check if a touchpoint is "direct" (no attribution data)
 */
export function isDirectTouchpoint(touchpoint: {
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  gclid?: string | null;
  referrer?: string | null;
}): boolean {
  return !touchpoint.utm_source &&
         !touchpoint.utm_medium &&
         !touchpoint.fbclid &&
         !touchpoint.ttclid &&
         !touchpoint.gclid &&
         (!touchpoint.referrer || touchpoint.referrer === '');
}
