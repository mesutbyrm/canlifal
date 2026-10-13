import { NextResponse } from 'next/server'
import { readSocialAccounts } from '@/lib/site-social-accounts'

export const dynamic = 'force-dynamic'

// GET /api/social-accounts — herkese açık: yalnızca etkin ve değeri dolu sitenin sosyal hesapları.
export async function GET() {
  try {
    const all = await readSocialAccounts()
    const accounts = all.filter((a) => a.enabled && a.value)
    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('[Social Accounts GET] Error:', error)
    return NextResponse.json({ error: 'Sosyal hesaplar alınamadı' }, { status: 500 })
  }
}
