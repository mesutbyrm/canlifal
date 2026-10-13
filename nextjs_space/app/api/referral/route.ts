import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// Get user's referral info
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        referralCode: true,
        referralCreditsEarned: true,
        referrals: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        referralHistory: {
          select: {
            id: true,
            creditsAwarded: true,
            createdAt: true,
            referred: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Calculate milestone rewards
    const referralCount = user.referrals.length;
    const milestones = [
      { count: 1, reward: 'free_reading', rewardText: { tr: 'Ücretsiz Fal', en: 'Free Reading' }, achieved: referralCount >= 1 },
      { count: 5, reward: 'credits_200', rewardText: { tr: '200 CFC', en: '200 CFC' }, achieved: referralCount >= 5 },
      { count: 20, reward: 'vip_fortune', rewardText: { tr: 'VIP Fal', en: 'VIP Fortune' }, achieved: referralCount >= 20 },
      { count: 50, reward: 'credits_1000', rewardText: { tr: '1000 CFC', en: '1000 CFC' }, achieved: referralCount >= 50 },
    ];

    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink: `${process.env.NEXTAUTH_URL || 'https://canlifal.com'}/kayit-ol?ref=${user.referralCode}`,
      totalReferrals: referralCount,
      totalCreditsEarned: user.referralCreditsEarned,
      referrals: user.referrals,
      history: user.referralHistory,
      milestones
    });
  } catch (error) {
    console.error('Referral info error:', error);
    return NextResponse.json({ error: 'Davet bilgisi alınamadı' }, { status: 500 });
  }
}
