import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { generateVisitorId, generateSessionId, hashIdentifier, getDeviceType, getBrowser, getOS } from '../../lib/utils.js';

export const collectRouter = Router();

const eventSchema = z.object({
  vid: z.string().optional(), // Visitor ID (from cookie/localStorage)
  sid: z.string().optional(), // Session ID (from cookie/localStorage)
  eventType: z.enum(['page_view', 'session_start', 'add_to_cart', 'begin_checkout', 'purchase']),
  
  // UTM parameters
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  
  // Click IDs
  fbclid: z.string().optional(),
  ttclid: z.string().optional(),
  gclid: z.string().optional(),
  wbraid: z.string().optional(),
  gbraid: z.string().optional(),
  msclkid: z.string().optional(),
  sccid: z.string().optional(),
  
  // Context
  referrer: z.string().optional(),
  landing_url: z.string().optional(),
  current_url: z.string().optional(),
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
  
  // Additional data
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
});

collectRouter.post('/', async (req, res) => {
  try {
    const data = eventSchema.parse(req.body);
    
    // Get or create visitor
    let visitor;
    if (data.vid) {
      visitor = await prisma.visitor.findUnique({
        where: { vid: data.vid },
      });
    }
    
    if (!visitor) {
      const vid = data.vid || generateVisitorId();
      visitor = await prisma.visitor.create({
        data: { vid },
      });
    }
    
    // Get or create session
    let session;
    if (data.sid) {
      session = await prisma.session.findFirst({
        where: {
          sid: data.sid,
          visitorId: visitor.id,
        },
      });
    }
    
    // Create new session for session_start events or if no session exists
    if (!session || data.eventType === 'session_start') {
      const sid = data.sid || generateSessionId();
      session = await prisma.session.create({
        data: {
          sid,
          visitorId: visitor.id,
        },
      });
    }
    
    // Hash IP address for privacy
    const hashedIp = data.ip_address ? hashIdentifier(data.ip_address) : null;
    
    // Parse device info from user agent
    const userAgent = data.user_agent || req.headers['user-agent'] || '';
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);
    
    // Create touchpoint
    const touchpoint = await prisma.touchpoint.create({
      data: {
        visitorId: visitor.id,
        sessionId: session.id,
        eventType: data.eventType,
        utmSource: data.utm_source,
        utmMedium: data.utm_medium,
        utmCampaign: data.utm_campaign,
        utmContent: data.utm_content,
        utmTerm: data.utm_term,
        fbclid: data.fbclid,
        ttclid: data.ttclid,
        gclid: data.gclid,
        wbraid: data.wbraid,
        gbraid: data.gbraid,
        msclkid: data.msclkid,
        sccid: data.sccid,
        referrer: data.referrer,
        landingUrl: data.landing_url || data.current_url,
        userAgent: userAgent,
        ipAddress: hashedIp,
        deviceType,
        browser,
        os,
        timestamp: new Date(),
      },
    });
    
    // Return visitor and session IDs for client to store
    res.json({
      success: true,
      vid: visitor.vid,
      sid: session.sid,
      touchpointId: touchpoint.id,
    });
  } catch (error) {
    console.error('Error collecting event:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid event data', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to collect event' });
  }
});
