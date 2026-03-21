import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public endpoint - returns active popups for the current user context
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user;

    const popups = await prisma.adminPopup.findMany({
      where: {
        isActive: true,
        showTo: { in: isLoggedIn ? ['all', 'logged_in'] : ['all', 'guests'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    // For live_streams type, fetch active streams
    const enrichedPopups = await Promise.all(
      popups.map(async (popup) => {
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
              take: 5,
            });
            return { ...base, liveStreams: streams };
          } catch {
            return base;
          }
        }
        if (popup.popupType === 'chat_rooms') {
          try {
            const rooms = await prisma.chatRoom.findMany({
              where: { isActive: true },
              select: {
                id: true,
                nameTr: true,
                slug: true,
                descTr: true,
              },
              take: 6,
              orderBy: { createdAt: 'asc' },
            });
            const mappedRooms = rooms.map((r: any) => ({ id: r.id, name: r.nameTr, slug: r.slug, description: r.descTr }));
            return { ...base, chatRooms: mappedRooms };
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
