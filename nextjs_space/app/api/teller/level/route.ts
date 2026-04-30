import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { calculateLevelPoints, getLevelForPoints, getProgressToNextLevel, TELLER_LEVELS, LEVEL_LABELS_TR, type TellerLevel } from '@/lib/teller-levels';

export const dynamic = 'force-dynamic';

// GET: Get current teller's level info
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const teller = await prisma.liveFortuneTeller.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        tellerLevel: true,
        levelPoints: true,
        totalSessions: true,
        totalEarnings: true,
        rating: true,
        createdAt: true,
        totalReviews: true,
      },
    });

    if (!teller) {
      return NextResponse.json({ error: 'Falcı profili bulunamadı' }, { status: 404 });
    }

    // Recalculate points
    const newPoints = calculateLevelPoints(teller);
    const newLevel = getLevelForPoints(newPoints);
    const currentLevel = (teller.tellerLevel || 'bronze') as TellerLevel;

    // Update if changed
    if (newPoints !== teller.levelPoints || newLevel !== currentLevel) {
      await prisma.liveFortuneTeller.update({
        where: { id: teller.id },
        data: {
          levelPoints: newPoints,
          tellerLevel: newLevel,
          levelUpdatedAt: new Date(),
        },
      });
    }

    const levelInfo = TELLER_LEVELS[newLevel];
    const progress = getProgressToNextLevel(newPoints, newLevel);
    const nextLevelKey = newLevel === 'diamond' ? null : (
      newLevel === 'bronze' ? 'silver' : newLevel === 'silver' ? 'gold' : 'diamond'
    ) as TellerLevel | null;

    return NextResponse.json({
      level: newLevel,
      levelLabel: LEVEL_LABELS_TR[newLevel],
      emoji: levelInfo.emoji,
      color: levelInfo.color,
      points: newPoints,
      progress,
      nextLevel: nextLevelKey ? {
        key: nextLevelKey,
        label: LEVEL_LABELS_TR[nextLevelKey],
        emoji: TELLER_LEVELS[nextLevelKey].emoji,
        pointsNeeded: TELLER_LEVELS[nextLevelKey].minPoints - newPoints,
      } : null,
      stats: {
        totalSessions: teller.totalSessions,
        totalEarnings: teller.totalEarnings,
        rating: teller.rating,
        totalReviews: teller.totalReviews,
      },
    });
  } catch (error) {
    console.error('Teller level error:', error);
    return NextResponse.json({ error: 'Seviye bilgisi alınamadı' }, { status: 500 });
  }
}
