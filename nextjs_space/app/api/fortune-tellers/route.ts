import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';
import { getCached } from '@/lib/cache';
import { computeTellerStatus, PRESENCE_LABELS } from '@/lib/presence-engine';

export const dynamic = 'force-dynamic';

// Fetch teller list from DB (shared across all users via cache)
async function fetchTellerList(specialty: string | null, onlineOnly: boolean, sort: string) {
  const where: Record<string, unknown> = {
    isActive: true,
    applicationStatus: 'approved',
    isBanned: false,
  };
  if (onlineOnly) where.isOnline = true;
  if (specialty) where.specialties = { has: specialty };

  let orderBy: any[] = [
    { isOnline: 'desc' },
    { rating: 'desc' },
    { totalSessions: 'desc' }
  ];
  if (sort === 'new') orderBy = [{ isOnline: 'desc' }, { createdAt: 'desc' }];
  else if (sort === 'top_rated') orderBy = [{ isOnline: 'desc' }, { rating: 'desc' }, { totalReviews: 'desc' }];
  else if (sort === 'price_low') orderBy = [{ isOnline: 'desc' }, { pricePerSession: 'asc' }];
  else if (sort === 'price_high') orderBy = [{ isOnline: 'desc' }, { pricePerSession: 'desc' }];

  // Run teller + stream queries in parallel
  const tellerQuery = prisma.liveFortuneTeller.findMany({
    where,
    select: {
      id: true, userId: true, displayName: true, bio: true, avatar: true,
      specialties: true, rating: true, totalSessions: true, totalReviews: true,
      pricePerSession: true, isOnline: true, isVerified: true, isActive: true,
      isBanned: true, applicationStatus: true, approvedAt: true, createdAt: true,
      user: { select: { name: true, image: true, lastActiveAt: true, membership: true, membershipExpiresAt: true } },
      sessions: {
        where: { status: { in: ['active', 'pending'] } },
        select: { id: true, status: true, userId: true },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy
  });

  // We need teller userIds for stream query, so we must await tellers first
  const tellers = await tellerQuery;
  const tellerUserIds = tellers.map((t: { userId: string }) => t.userId);
  const activeStreams = tellerUserIds.length > 0 
    ? await prisma.videoStream.findMany({
        where: { userId: { in: tellerUserIds }, status: 'live' },
        select: { userId: true }
      })
    : [];
  const streamingUserIds = new Set(activeStreams.map((s: { userId: string }) => s.userId));

  // Batch favorite counts
  const tellerIds = tellers.map((t: { id: string }) => t.id);
  const favCounts = tellerIds.length > 0
    ? await prisma.favoriteTeller.groupBy({ by: ['tellerId'], where: { tellerId: { in: tellerIds } }, _count: true })
    : [];
  const favCountMap = new Map(favCounts.map((f: any) => [f.tellerId, f._count]));

  return tellers.map((teller: typeof tellers[number]) => {
    const isStreaming = streamingUserIds.has(teller.userId);
    const activeSessions = teller.sessions.filter((s: { status: string }) => s.status === 'active');
    const pendingSessions = teller.sessions.filter((s: { status: string }) => s.status === 'pending');
    const { sessions, user, ...tellerData } = teller;
    // Fall back to user.image if teller has no custom avatar
    if (!tellerData.avatar && user?.image) {
      tellerData.avatar = user.image;
    }
    // F5: backend-canonical presence status (frontend must not guess)
    const presenceStatus = computeTellerStatus({
      isOnline: teller.isOnline,
      lastActiveAt: user?.lastActiveAt ?? null,
      isStreaming,
      isInSession: activeSessions.length > 0,
    });
    const presenceLabel = PRESENCE_LABELS[presenceStatus];
    const isNewTeller = tellerData.approvedAt
      ? (Date.now() - new Date(tellerData.approvedAt).getTime()) < 7 * 24 * 60 * 60 * 1000
      : (Date.now() - new Date(tellerData.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
    const trendingScore = (pendingSessions.length * 3) +
      (activeSessions.length * 5) +
      (teller.isOnline ? 10 : 0) +
      (isStreaming ? 8 : 0) +
      (teller.rating >= 4.5 ? 5 : 0);
    const isGold = user?.membership === 'gold' && (!user?.membershipExpiresAt || new Date(user.membershipExpiresAt) > new Date());
    return {
      ...tellerData,
      isStreaming,
      isInSession: activeSessions.length > 0,
      presenceStatus,
      presenceLabel,
      pendingCount: pendingSessions.length,
      pendingUserIds: pendingSessions.map((s: { userId: string }) => s.userId),
      isNewTeller,
      trendingScore,
      favoriteCount: favCountMap.get(teller.id) || 0,
      isGoldUser: isGold,
    };
  });
}

// Get all active fortune tellers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const onlineOnly = searchParams.get('online') === 'true';
    const sort = searchParams.get('sort') || 'default';

    // Cache teller list for 10 seconds - collapses hundreds of identical queries
    const cacheKey = `tellers:list:${specialty || 'all'}:${onlineOnly}:${sort}`;
    const baseTellers = await getCached(cacheKey, 10, () => fetchTellerList(specialty, onlineOnly, sort));

    // Per-user enrichment (queue position) - lightweight, no DB query
    const authUser = await authenticateRequest(request).catch(() => null)
    const currentUserId = authUser?.id;

    const enrichedTellers = baseTellers.map((t: any) => {
      let queuePosition = 0;
      if (currentUserId && t.pendingUserIds?.length > 0) {
        const idx = t.pendingUserIds.indexOf(currentUserId);
        if (idx >= 0) queuePosition = idx + 1;
      }
      const { pendingUserIds, ...rest } = t;
      return { ...rest, queuePosition };
    });

    if (sort === 'trending') {
      enrichedTellers.sort((a: any, b: any) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return b.trendingScore - a.trendingScore;
      });
    }

    return NextResponse.json({ tellers: enrichedTellers });
  } catch (error) {
    console.error('Fortune tellers error:', error);
    return NextResponse.json({ tellers: [] });
  }
}

// Apply to become a fortune teller
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, bio, specialties, pricePerSession } = body;

    // Check if already has a profile
    const existing = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id }
    });

    if (existing) {
      return NextResponse.json({ error: 'Already have a profile' }, { status: 400 });
    }

    const teller = await prisma.liveFortuneTeller.create({
      data: {
        userId: authUser.id,
        displayName: displayName || authUser.name || 'Fortune Teller',
        bio: bio || null,
        specialties: specialties || [],
        pricePerSession: pricePerSession || 100,
        isVerified: false, // Admin needs to verify
        isActive: true,
        isOnline: false
      }
    });

    return NextResponse.json(teller, { status: 201 });
  } catch (error) {
    console.error('Create teller error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
