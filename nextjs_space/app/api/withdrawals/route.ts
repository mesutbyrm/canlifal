import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';
import { getCachedPlatformSetting } from '@/lib/cache';
import { requireFeature } from '@/lib/check-feature';
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { recordLedger } from '@/lib/ledger';
import { recordRiskEvent } from '@/lib/risk-score';
import { getAuditIp } from '@/lib/audit-log';
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency';
import { isConvertibleCurrency } from '@/lib/currency-branding';

export const dynamic = 'force-dynamic';

// GET: List user's withdrawal requests
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Fetch withdrawals error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Create a new withdrawal request
export async function POST(request: NextRequest) {
  let idemRecord: string | null = null;
  try {
    // Feature flag kontrolü
    const featureBlocked = await requireFeature('WITHDRAWAL_ENABLED')
    if (featureBlocked) return featureBlocked

    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    // Rate limit: para çekme talebi (varsayılan 5/dk)
    const limited = await guardRateLimit(request, 'withdrawal', { userId: authUser.id });
    if (limited) return limited;

    const { amount, method, accountDetails, currency } = await request.json();

    // ⚠️ KURAL: Yalnızca JETON paraya çevrilebilir. CFC asla çekilemez.
    if (currency && !isConvertibleCurrency(currency)) {
      return NextResponse.json(
        { error: 'Bu para birimi paraya çevrilemez. Yalnızca jeton bakiyesi çekilebilir.' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Geçersiz miktar' }, { status: 400 });
    }
    if (!method || !accountDetails) {
      return NextResponse.json({ error: 'Yöntem ve hesap bilgileri gerekli' }, { status: 400 });
    }

    // Check if user is a teller with canWithdraw
    const teller = await prisma.liveFortuneTeller.findFirst({
      where: { userId: authUser.id },
    });
    if (!teller || !teller.canWithdraw) {
      return NextResponse.json({ error: 'Para çekme yetkiniz yok' }, { status: 403 });
    }

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
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

    // Check minimum withdrawal from settings (cached)
    const minStr = await getCachedPlatformSetting('min_withdrawal', '100');
    const minWithdrawal = parseInt(minStr);
    if (amount < minWithdrawal) {
      return NextResponse.json({ error: `Minimum çekim: ${minWithdrawal} jeton` }, { status: 400 });
    }

    // Check for pending requests
    const pending = await prisma.withdrawalRequest.findFirst({
      where: { userId: authUser.id, status: { in: ['pending', 'agency_approved'] } },
    });
    if (pending) {
      return NextResponse.json({ error: 'Zaten bekleyen bir çekim talebiniz var' }, { status: 400 });
    }

    // Get TL rate (cached)
    const rateStr = await getCachedPlatformSetting('jeton_tl_rate', '0.5');
    const jetonTlRate = parseFloat(rateStr);
    const amountTL = parseFloat((amount * jetonTlRate).toFixed(2));

    // Check if user belongs to an agency
    const agencyMembership = await prisma.agencyUser.findFirst({
      where: { userId: authUser.id, isActive: true },
      select: { agencyId: true },
    });

    // Idempotency: reserved only once every validation has passed, so a
    // rejected request never blocks a corrected retry with the same key.
    const idem = await beginIdempotent(request, 'withdrawal', authUser.id);
    if (idem.response) return idem.response;
    idemRecord = idem.record;

    // Create withdrawal request
    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId: authUser.id,
        amount,
        amountTL,
        method,
        accountDetails,
        agencyId: agencyMembership?.agencyId || null,
        // If user is in agency → pending (needs agency approval first)
        // If no agency → agency_approved (skip to admin approval)
        status: agencyMembership ? 'pending' : 'agency_approved',
      },
    });

    // Ledger: record withdrawal request (fire-and-forget)
    recordLedger({
      debit: { accountType: 'user_jeton', accountId: authUser.id },
      credit: { accountType: 'platform_jeton', accountId: 'PLATFORM' },
      amount,
      category: 'withdrawal',
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawal.id,
      actorId: authUser.id,
      metadata: { amountTL, method },
    }).catch(e => console.error('[Ledger] withdrawal error:', e))

    // Risk skoru (Faz 9): yalnızca gözlem amaçlı, akışı engellemez
    recordRiskEvent({
      userId: authUser.id,
      category: 'withdrawal',
      amount,
      currency: 'jeton',
      referenceType: 'WithdrawalRequest',
      referenceId: withdrawal.id,
      ip: getAuditIp(request as any),
      metadata: { amountTL, method },
    }).catch(e => console.error('[Risk] withdrawal error:', e))

    const responseBody = { success: true, withdrawal };
    await completeIdempotent(idemRecord, 200, responseBody);
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Create withdrawal error:', error);
    // Free the key so the client can safely retry after a failure.
    await releaseIdempotent(idemRecord);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
