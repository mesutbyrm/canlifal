import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST: Set withdrawal limit for a specific user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { userId, limit } = await request.json();

    if (!userId || limit === undefined || limit < 0) {
      return NextResponse.json({ error: 'userId and valid limit required' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { withdrawalLimit: parseInt(limit) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set withdrawal limit error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}
