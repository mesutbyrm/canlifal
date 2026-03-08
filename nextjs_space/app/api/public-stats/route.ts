import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all statistics in parallel
    const [
      fortuneStats,
      totalFortunes,
      chatRooms,
      socialPostsCount,
      socialActiveUsers,
      totalUsers,
      activeVideoStreams
    ] = await Promise.all([
      // Fortune statistics by type
      prisma.fortune.groupBy({
        by: ['fortuneType'],
        _count: { fortuneType: true }
      }),
      // Total fortunes
      prisma.fortune.count(),
      // Chat rooms with presence count
      prisma.chatRoom.findMany({
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameTr: true,
          icon: true,
        }
      }),
      // Total social posts
      prisma.socialPost.count(),
      // Active social users (posted in last 24 hours)
      prisma.socialPost.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: oneDayAgo }
        }
      }).then((r: { userId: string }[]) => r.length),
      // Total registered users
      prisma.user.count(),
      // Active video streams and their viewer counts
      prisma.videoStream.findMany({
        where: { 
          status: 'live',
          endedAt: null
        },
        select: { viewerCount: true }
      })
    ]);

    // Get chat presence for each room
    const chatPresences = await prisma.chatPresence.groupBy({
      by: ['roomId'],
      where: {
        lastSeen: { gte: twoMinutesAgo }
      },
      _count: { roomId: true }
    });

    // Map presence counts to rooms
    const presenceMap = new Map(chatPresences.map((p: { roomId: string; _count: { roomId: number } }) => [p.roomId, p._count.roomId]));
    
    const chatRoomsWithPresence = chatRooms.map((room: { id: string; slug: string; nameEn: string; nameTr: string; icon: string }) => ({
      ...room,
      onlineCount: presenceMap.get(room.id) || 0
    }));

    // Total online in chat
    const totalChatOnline = chatPresences.reduce((sum: number, p: { roomId: string; _count: { roomId: number } }) => sum + p._count.roomId, 0);
    
    // Total video stream viewers
    const totalVideoViewers = activeVideoStreams.reduce((sum: number, s: { viewerCount: number }) => sum + s.viewerCount, 0);
    
    // Total online = chat + video viewers (with minimum of 1 for base activity)
    const totalOnline = Math.max(1, totalChatOnline + totalVideoViewers);

    // Format fortune stats
    const fortunesByType: Record<string, number> = {};
    fortuneStats.forEach((stat: { fortuneType: string; _count: { fortuneType: number } }) => {
      fortunesByType[stat.fortuneType] = stat._count.fortuneType;
    });

    return NextResponse.json({
      fortunes: {
        total: totalFortunes,
        byType: fortunesByType
      },
      chat: {
        rooms: chatRoomsWithPresence,
        totalOnline: totalChatOnline
      },
      video: {
        activeStreams: activeVideoStreams.length,
        totalViewers: totalVideoViewers
      },
      social: {
        totalPosts: socialPostsCount,
        activeUsers: socialActiveUsers
      },
      users: {
        total: totalUsers
      },
      totalOnline
    });
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json({
      fortunes: { total: 0, byType: {} },
      chat: { rooms: [], totalOnline: 0 },
      video: { activeStreams: 0, totalViewers: 0 },
      social: { totalPosts: 0, activeUsers: 0 },
      users: { total: 0 },
      totalOnline: 1
    });
  }
}
