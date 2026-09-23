import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// Public endpoint - returns active popups for the current user context
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    const isLoggedIn = !!authUser;

    // Support polling: client sends ?since=<ISO timestamp>
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    const whereClause: any = {
      isActive: true,
      showTo: { in: isLoggedIn ? ['all', 'logged_in'] : ['all', 'guests'] },
    };

    // If since is provided, only return popups that were sent after that time
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        whereClause.lastSentAt = { gt: sinceDate };
      }
    }

    const popups = await prisma.adminPopup.findMany({
      where: whereClause,
      orderBy: [{ priority: 'desc' }, { lastSentAt: 'desc' }],
      take: 5,
    });

    // Enrich popups with live data
    const enrichedPopups = await Promise.all(
      popups.map(async (popup: any) => {
        const base = {
          ...popup,
          buttons: typeof popup.buttons === 'string' ? JSON.parse(popup.buttons) : popup.buttons,
        };

        if (popup.popupType === 'live_streams') {
          try {
            const streams = await prisma.videoStream.findMany({
              where: { status: 'live' },
              select: {
                id: true,
                title: true,
                viewerCount: true,
                user: { select: { name: true, image: true } },
              },
              orderBy: { viewerCount: 'desc' },
              take: 3, // Top 3 live streams
            });
            return { ...base, liveStreams: streams };
          } catch {
            return base;
          }
        }

        if (popup.popupType === 'chat_rooms') {
          try {
            // Get rooms with active user counts (lastSeen within 2 minutes)
            const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
            const rooms = await prisma.chatRoom.findMany({
              where: { isActive: true },
              select: {
                id: true,
                nameTr: true,
                slug: true,
                icon: true,
                descTr: true,
                presences: {
                  where: { lastSeen: { gte: twoMinAgo } },
                  select: { id: true },
                },
              },
            });
            // Sort by active user count desc, take top 2
            const sorted = rooms
              .map((r: any) => ({
                id: r.id,
                name: r.nameTr,
                slug: r.slug,
                icon: r.icon || '💬',
                description: r.descTr,
                activeUsers: r.presences.length,
              }))
              .sort((a: any, b: any) => b.activeUsers - a.activeUsers)
              .slice(0, 2);
            return { ...base, chatRooms: sorted };
          } catch {
            return base;
          }
        }

        return base;
      })
    );

    return NextResponse.json(enrichedPopups);
  } catch (error) {
    console.error('Popups GET error:', error);
    return NextResponse.json([]);
  }
}
