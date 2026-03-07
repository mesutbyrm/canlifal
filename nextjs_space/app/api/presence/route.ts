import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update presence (heartbeat) and get visitor count
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json().catch(() => ({}));
    const { visitorId, path } = body;

    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;

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
