import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { calculateLevelPoints, getLevelForPoints } from '@/lib/teller-levels';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

// POST: Recalculate all teller levels (admin action)
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.teller.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetki yok' }, { status: 403 });
    }

    const tellers = await prisma.liveFortuneTeller.findMany({
      where: { isActive: true },
      select: {
        id: true,
        totalSessions: true,
        totalEarnings: true,
        rating: true,
        createdAt: true,
        tellerLevel: true,
        levelPoints: true,
      },
    });

    let updated = 0;
    let promoted = 0;

    for (const teller of tellers) {
      const newPoints = calculateLevelPoints(teller);
      const newLevel = getLevelForPoints(newPoints);
      const changed = newPoints !== teller.levelPoints || newLevel !== teller.tellerLevel;
      
      if (changed) {
        const wasPromoted = newLevel !== teller.tellerLevel;
        await prisma.liveFortuneTeller.update({
          where: { id: teller.id },
          data: {
            levelPoints: newPoints,
            tellerLevel: newLevel,
            levelUpdatedAt: new Date(),
          },
        });
        updated++;
        if (wasPromoted) promoted++;
      }
    }

    return NextResponse.json({ success: true, total: tellers.length, updated, promoted });
  } catch (error) {
    console.error('Teller level recalc error:', error);
    return NextResponse.json({ error: 'Seviye hesaplama başarısız' }, { status: 500 });
  }
}
