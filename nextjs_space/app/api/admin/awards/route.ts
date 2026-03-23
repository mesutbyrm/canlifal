import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List all awards or awards for a teller
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const awards = await prisma.tellerAward.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch teller info for each award
    const tellerIds = [...new Set(awards.map((a: { tellerId: string }) => a.tellerId))];
    const tellers = await prisma.liveFortuneTeller.findMany({
      where: { id: { in: tellerIds } },
      select: { id: true, displayName: true, avatar: true },
    });
    const tellerMap = Object.fromEntries(tellers.map((t: { id: string; displayName: string | null; avatar: string | null }) => [t.id, t]));

    const enrichedAwards = awards.map((a: { tellerId: string; [key: string]: unknown }) => ({
      ...a,
      teller: tellerMap[a.tellerId] || null,
    }));

    return NextResponse.json({ awards: enrichedAwards });
  } catch (error) {
    console.error('Admin fetch awards error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Create a new award
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { tellerId, awardType, title, startDate, endDate } = await request.json();

    if (!tellerId || !awardType || !title) {
      return NextResponse.json({ error: 'tellerId, awardType, and title are required' }, { status: 400 });
    }

    const teller = await prisma.liveFortuneTeller.findUnique({ where: { id: tellerId } });
    if (!teller) {
      return NextResponse.json({ error: 'Teller not found' }, { status: 404 });
    }

    const award = await prisma.tellerAward.create({
      data: {
        tellerId,
        awardType,
        title,
        awardedBy: session.user.id,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true, award });
  } catch (error) {
    console.error('Admin create award error:', error);
    return NextResponse.json({ error: 'Failed to create award' }, { status: 500 });
  }
}

// DELETE: Remove an award
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const awardId = searchParams.get('id');
    if (!awardId) {
      return NextResponse.json({ error: 'Award ID required' }, { status: 400 });
    }

    await prisma.tellerAward.delete({ where: { id: awardId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete award error:', error);
    return NextResponse.json({ error: 'Failed to delete award' }, { status: 500 });
  }
}
