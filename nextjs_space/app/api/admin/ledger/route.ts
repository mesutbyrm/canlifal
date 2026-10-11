export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

const ADMIN_ROLES = ['admin', 'yonetici', 'finans']

// GET /api/admin/ledger — paginated ledger listing
export async function GET(req: NextRequest) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'finance.ledger.view', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(req.url)
  const accountId = url.searchParams.get('accountId') || undefined
  const category = url.searchParams.get('category') || undefined
  const transactionId = url.searchParams.get('transactionId') || undefined
  const cursor = url.searchParams.get('cursor') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

  const where: any = {}
  if (accountId) where.accountId = accountId
  if (category) where.category = category
  if (transactionId) where.transactionId = transactionId
  if (cursor) where.createdAt = { lt: new Date(cursor) }

  const entries = await prisma.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Also get summary stats
  const stats = await prisma.ledgerEntry.aggregate({
    _count: true,
    where: accountId ? { accountId } : {},
  })

  return NextResponse.json({
    success: true,
    data: entries,
    total: stats._count,
    nextCursor: entries.length === limit ? entries[entries.length - 1].createdAt.toISOString() : null,
  })
}
