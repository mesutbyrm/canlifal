import { NextRequest, NextResponse } from 'next/server'
import { GET as financeOverview } from '../route'

export const dynamic = 'force-dynamic'

// GET /api/admin/finance/summary?period=monthly|daily|weekly|yearly|all
// Tek kaynak: /api/admin/finance?section=overview hesabı (aynı yetki denetimi, aynı dönem filtresi; özel aralık from/to).
// Bu uç yalnızca Flutter'ın beklediği şekle eşler; yeni finansal formül tanımlamaz.
//   revenue.totalTL          → tamamlanmış ödemelerin TL toplamı
//   revenue.transactionCount → tamamlanmış ödeme sayısı
//   spending.gifts.total     → hediye harcaması (jeton)
//   withdrawals.totalTL      → tamamlanmış çekimlerin brüt TL toplamı
//   net.revenueTL            → revenue.totalTL − withdrawals.totalTL (nakit bazlı net)
// excludeTest parametresi overview'un zaten uyguladığı admin/yönetici hariç tutmasıyla karşılanır.
export async function GET(req: NextRequest) {
  try {
    const src = new URL(req.url)
    const inner = new URL(req.url)
    inner.pathname = '/api/admin/finance'
    inner.searchParams.set('section', 'overview')
    if (src.searchParams.get('period')) inner.searchParams.set('period', src.searchParams.get('period')!)
    if (src.searchParams.get('from')) inner.searchParams.set('from', src.searchParams.get('from')!)
    if (src.searchParams.get('to')) inner.searchParams.set('to', src.searchParams.get('to')!)

    const innerReq = new NextRequest(inner, { headers: req.headers })
    const res = await financeOverview(innerReq)
    if (!res.ok) return res

    const o: any = await res.json()
    const revenueTL = Number(o.totalRevenue || 0)
    const withdrawalsTL = Number(o.withdrawals?.totalTL || 0)

    return NextResponse.json({
      period: o.period || 'monthly',
      revenue: {
        totalTL: revenueTL,
        transactionCount: Number(o.revenueTransactionCount || 0),
      },
      spending: {
        gifts: { total: Number(o.totalGiftSpent || 0) },
      },
      withdrawals: {
        totalTL: withdrawalsTL,
        count: Number(o.withdrawals?.count || 0),
      },
      net: {
        revenueTL: revenueTL - withdrawalsTL,
      },
    })
  } catch (error: any) {
    console.error('[Admin Finance Summary GET] Error:', error)
    return NextResponse.json({ error: 'Finans özeti alınamadı' }, { status: 500 })
  }
}
