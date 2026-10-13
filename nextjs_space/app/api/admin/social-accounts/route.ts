import { NextRequest, NextResponse } from 'next/server'
import { requireFullAdmin } from '@/lib/rbac'
import { loadSocialAccounts, saveSocialAccounts } from '@/lib/social-accounts'

export const dynamic = 'force-dynamic'

/** GET /api/admin/social-accounts */
export async function GET(req: NextRequest) {
  const denied = await requireFullAdmin(req)
  if (denied) return denied
  try {
    const accounts = await loadSocialAccounts()
    return NextResponse.json({ success: true, accounts })
  } catch (e) {
    console.error('[admin/social-accounts GET]', e)
    return NextResponse.json({ success: false, error: 'Hesaplar alınamadı' }, { status: 500 })
  }
}

/** PUT /api/admin/social-accounts */
export async function PUT(req: NextRequest) {
  const denied = await requireFullAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json().catch(() => ({}))
    const rows = Array.isArray(body.accounts) ? body.accounts : []
    const accounts = await saveSocialAccounts(rows)
    return NextResponse.json({ success: true, accounts })
  } catch (e) {
    console.error('[admin/social-accounts PUT]', e)
    return NextResponse.json({ success: false, error: 'Kaydedilemedi' }, { status: 500 })
  }
}
