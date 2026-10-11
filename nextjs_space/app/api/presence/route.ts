import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import crypto from 'crypto';
import { parseUserAgent } from '@/lib/ua-parser';
import { maybeEmitOnlineEntrance } from '@/lib/presence-engine';

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
    const authUser = await authenticateRequest(request).catch(() => null);
    const body = await request.json().catch(() => ({}));
    const { visitorId, path, isNewSession } = body;

    // Uygulama arka plana/çıkışa geçince çevrimiçi durumu hemen düşer (2 dk beklemeden).
    // Yalnız oturum sahibinin kendi kaydı silinir; lastActiveAt "son görülme" olarak kalır.
    if (body?.action === 'leave') {
      if (!authUser?.id) return NextResponse.json({ ok: true });
      await prisma.sitePresence.deleteMany({
        where: visitorId ? { visitorId, userId: authUser.id } : { userId: authUser.id },
      });
      return NextResponse.json({ ok: true });
    }

    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Parse user-agent for device type and bot detection
    const uaInfo = parseUserAgent(userAgent);

    // Upsert presence record
    await prisma.sitePresence.upsert({
      where: { visitorId },
      update: {
        lastSeen: new Date(),
        userId: authUser?.id || null,
        path: path || null,
        userAgent,
        deviceType: uaInfo.deviceType,
        isBot: uaInfo.isBot,
        botName: uaInfo.botName,
      },
      create: {
        visitorId,
        userId: authUser?.id || null,
        lastSeen: new Date(),
        path: path || null,
        userAgent,
        deviceType: uaInfo.deviceType,
        isBot: uaInfo.isBot,
        botName: uaInfo.botName,
      },
    });

    // Update user's lastActiveAt and track activity if logged in
    if (authUser?.id) {
      const userId = authUser?.id;
      const now = new Date();

      // F5: read previous lastActiveAt BEFORE update to detect offline->online transition
      const prev = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastActiveAt: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: now },
      });

      // F5: emit Gold online-entrance (USER_ONLINE) once per online session (deduped)
      maybeEmitOnlineEntrance(userId, prev?.lastActiveAt ?? null).catch(() => {});
      
      // Activity Tracking: Track login sessions, daily/hourly activity
      try {
        const uaInfo2 = parseUserAgent(userAgent);
        
        // 1. Login Session tracking
        // Find active session (one that has no logoutAt and was updated recently - within 5 min)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeLoginSession = await prisma.userLoginSession.findFirst({
          where: {
            userId,
            logoutAt: null,
            loginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // within last 24h
          },
          orderBy: { loginAt: 'desc' }
        });
        
        if (activeLoginSession) {
          // Update duration of existing session
          const durationMin = Math.round((now.getTime() - new Date(activeLoginSession.loginAt).getTime()) / 60000);
          await prisma.userLoginSession.update({
            where: { id: activeLoginSession.id },
            data: { duration: durationMin }
          });
        } else {
          // Create new login session
          await prisma.userLoginSession.create({
            data: {
              userId,
              loginAt: now,
              deviceType: uaInfo2.deviceType || 'unknown',
              browser: userAgent?.substring(0, 100) || null,
            }
          });
        }
        
        // 2. Daily activity tracking - add ~0.5 min per heartbeat (heartbeat every ~30s)
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        await prisma.userDailyActivity.upsert({
          where: { userId_date: { userId, date: today } },
          update: { minutesSpent: { increment: 1 } },
          create: {
            userId,
            date: today,
            minutesSpent: 1,
          }
        });
        
        // 3. Hourly activity tracking
        const currentHour = now.getHours();
        await prisma.userHourlyActivity.upsert({
          where: { userId_hour: { userId, hour: currentHour } },
          update: { 
            totalMinutes: { increment: 1 },
            loginCount: { increment: 0 } // don't increment on heartbeat
          },
          create: {
            userId,
            hour: currentHour,
            totalMinutes: 1,
            loginCount: 1,
          }
        });
        
        // 4. Update user totalTimeSpentMinutes
        await prisma.user.update({
          where: { id: userId },
          data: { totalTimeSpentMinutes: { increment: 1 } }
        });
      } catch (activityErr) {
        console.error('Activity tracking error (non-critical):', activityErr);
      }
    }

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
            userId: authUser?.id || null,
            path: path || null,
            userAgent,
            country: geoInfo.country,
            city: geoInfo.city,
            ipHash: hashIP(ip),
            deviceType: uaInfo.deviceType,
            isBot: uaInfo.isBot,
            botName: uaInfo.botName,
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
