import { NextResponse } from 'next/server'
import { loadSocialAccounts } from '@/lib/social-accounts'

export const dynamic = 'force-dynamic'

/** GET /api/social-accounts — yalnız etkin, http(s) hesaplar. */
export async function GET() {
  try {
    const accounts = await loadSocialAccounts()
    const publicList = accounts.filter((a) => a.enabled && a.url.startsWith('http'))
    return NextResponse.json({ success: true, accounts: publicList })
  } catch (e) {
    console.error('[social-accounts GET]', e)
    return NextResponse.json({ success: false, error: 'Hesaplar alınamadı' }, { status: 500 })
  }
}
