import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { recordLedger } from '@/lib/ledger'
import { recordAudit } from '@/lib/audit-log'
import { awardTopupCommissions } from '@/lib/referral-commission'
import { applyTopupBonus } from '@/lib/currency-branding'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !(await staffCan(session?.user?.role, (session?.user as any)?.id, 'finance.jeton.adjust', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, amount, currency = 'credits' } = body

    if (!userId || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Geçersiz istek' },
        { status: 400 }
      )
    }

    const updateData = currency === 'jeton' 
      ? { jetonBalance: { increment: amount } }
      : { credits: { increment: amount } }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, credits: true, jetonBalance: true },
    })

    // Ledger: record admin balance adjustment (fire-and-forget)
    const acctType = currency === 'jeton' ? 'user_jeton' : 'user_cfc'
    recordLedger({
      debit: amount > 0
        ? { accountType: 'platform_jeton', accountId: 'PLATFORM' }
        : { accountType: acctType as any, accountId: userId },
      credit: amount > 0
        ? { accountType: acctType as any, accountId: userId }
        : { accountType: 'platform_jeton', accountId: 'PLATFORM' },
      amount: Math.abs(amount),
      category: 'admin_adjust',
      currency: currency === 'jeton' ? 'jeton' : 'cfc',
      actorId: session.user.id,
      metadata: { adminAction: true, originalAmount: amount },
    }).catch(e => console.error('[Ledger] admin credit error:', e))

    // Audit: record admin balance change
    recordAudit({
      actorId: session.user.id,
      actorRole: (session.user as any).role || 'admin',
      action: 'balance_adjust',
      targetType: 'User',
      targetId: userId,
      after: { [currency]: amount, newBalance: currency === 'jeton' ? user.jetonBalance : user.credits },
      description: `Admin ${amount > 0 ? 'ekledi' : 'düştü'}: ${Math.abs(amount)} ${currency}`,
    }).catch(e => console.error('[Audit] admin credit error:', e))

    // Kademeli yükleme bonusu (yalnızca yükleme işlemlerinde)
    if (amount > 0) {
      applyTopupBonus({
        userId,
        amount,
        currency: currency === 'jeton' ? 'jeton' : 'credits',
        sourceType: 'admin_credit',
      }).catch(e => console.error('[TopupBonus] admin credit error:', e))
    }

    // Referans / ajans komisyonu (yalnızca yükleme işlemlerinde)
    if (amount > 0) {
      awardTopupCommissions({
        userId,
        amount,
        currency: currency === 'jeton' ? 'jeton' : 'credits',
        sourceType: 'admin_credit',
      }).catch(e => console.error('[Commission] admin credit error:', e))
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Update credits error:', error)
    return NextResponse.json(
      { error: 'Jeton güncellenemedi' },
      { status: 500 }
    )
  }
}
