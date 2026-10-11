import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic';

// POST: Set withdrawal limit for a specific user
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'moderation.user.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
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
