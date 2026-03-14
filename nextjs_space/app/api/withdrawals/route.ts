import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List user's withdrawal requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch withdrawals error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Create a new withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, method, accountDetails } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçersiz miktar' }, { status: 400 });
    }
    if (!method || !accountDetails) {
      return NextResponse.json({ error: 'Yöntem ve hesap bilgileri gerekli' }, { status: 400 });
    }

    // Check if user is a teller with canWithdraw
    const teller = await prisma.liveFortuneTeller.findFirst({
      where: { userId: session.user.id },
    });
    if (!teller || !teller.canWithdraw) {
      return NextResponse.json({ error: 'Para çekme yetkiniz yok' }, { status: 403 });
    }

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true, withdrawalLimit: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    if (amount > user.jetonBalance) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 });
    }
    if (user.withdrawalLimit > 0 && amount > user.withdrawalLimit) {
      return NextResponse.json({ error: `Maksimum çekim limiti: ${user.withdrawalLimit} jeton` }, { status: 400 });
    }

    // Check minimum withdrawal from settings
    const minSetting = await prisma.platformSettings.findUnique({ where: { key: 'min_withdrawal' } });
    const minWithdrawal = minSetting ? parseInt(minSetting.value) : 100;
    if (amount < minWithdrawal) {
      return NextResponse.json({ error: `Minimum çekim: ${minWithdrawal} jeton` }, { status: 400 });
    }

    // Check for pending requests
    const pending = await prisma.withdrawalRequest.findFirst({
      where: { userId: session.user.id, status: 'pending' },
    });
    if (pending) {
      return NextResponse.json({ error: 'Zaten bekleyen bir çekim talebiniz var' }, { status: 400 });
    }

    // Get TL rate
    const rateSetting = await prisma.platformSettings.findUnique({ where: { key: 'jeton_tl_rate' } });
    const jetonTlRate = rateSetting ? parseFloat(rateSetting.value) : 0.5;
    const amountTL = parseFloat((amount * jetonTlRate).toFixed(2));

    // Create withdrawal request (don't deduct yet - admin will approve)
    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId: session.user.id,
        amount,
        amountTL,
        method,
        accountDetails,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, withdrawal });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
