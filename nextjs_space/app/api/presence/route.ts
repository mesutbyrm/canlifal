import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Get geo info from IP using free API
async function getGeoInfo(ip: string): Promise<{ country?: string; city?: string }> {
  try {
    // Skip for localhost/private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'TR', city: 'Unknown' };
    }
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city`, {
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      const data = await response.json();
      return { country: data.countryCode || 'Unknown', city: data.city || 'Unknown' };
    }
  } catch {
    // Ignore errors
  }
  return { country: 'Unknown', city: 'Unknown' };
}

// Hash IP for privacy
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'falci_salt').digest('hex').substring(0, 16);
}

// Update presence (heartbeat) and get visitor count
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json().catch(() => ({}));
    const { visitorId, path, isNewSession } = body;

    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Upsert presence record
    await prisma.sitePresence.upsert({
      where: { visitorId },
      update: {
        lastSeen: new Date(),
        userId: session?.user?.id || null,
        path: path || null,
        userAgent,
      },
      create: {
        visitorId,
        userId: session?.user?.id || null,
        lastSeen: new Date(),
        path: path || null,
        userAgent,
      },
    });

    // Record visit if new session (first visit of the day for this visitor)
    if (isNewSession) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if visitor already recorded today
      const existingVisit = await prisma.siteVisit.findFirst({
        where: {
          visitorId,
          visitedAt: { gte: today }
        }
      });

      if (!existingVisit) {
        // Get geo info
        const geoInfo = await getGeoInfo(ip);
        
        // Create visit record
        await prisma.siteVisit.create({
          data: {
            visitorId,
            userId: session?.user?.id || null,
            path: path || null,
            userAgent,
            country: geoInfo.country,
            city: geoInfo.city,
            ipHash: hashIP(ip),
          }
        });
      }
    }

    // Clean up stale presences (older than 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await prisma.sitePresence.deleteMany({
      where: { lastSeen: { lt: twoMinutesAgo } },
    });

    // Count active visitors (seen in last 2 minutes)
    const activeCount = await prisma.sitePresence.count({
      where: { lastSeen: { gte: twoMinutesAgo } },
    });

    return NextResponse.json({ count: activeCount });
  } catch (error) {
    console.error('Presence error:', error);
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}

// Get current visitor count
export async function GET() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    // Count active visitors
    const activeCount = await prisma.sitePresence.count({
      where: { lastSeen: { gte: twoMinutesAgo } },
    });

    // Get list of active visitors for admin (optional)
    const visitors = await prisma.sitePresence.findMany({
      where: { lastSeen: { gte: twoMinutesAgo } },
      select: {
        visitorId: true,
        userId: true,
        path: true,
        lastSeen: true,
      },
      orderBy: { lastSeen: 'desc' },
    });

    return NextResponse.json({ count: activeCount, visitors });
  } catch (error) {
    console.error('Presence fetch error:', error);
    return NextResponse.json({ count: 0, visitors: [] });
  }
}
