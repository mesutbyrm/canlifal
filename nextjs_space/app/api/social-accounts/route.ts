import { NextResponse } from 'next/server'
import { readSocialAccounts } from '@/lib/social-accounts'

export const dynamic = 'force-dynamic'

/**
 * GET /api/social-accounts — herkese açık; yalnız etkin hesaplar.
 * Yanıt: { accounts: [{ platform, label, handle, url }] }
 */
export async function GET() {
  try {
    const accounts = (await readSocialAccounts())
      .filter((a) => a.enabled)
      .map(({ platform, label, handle, url }) => ({ platform, label, handle, url }))
    return NextResponse.json(
      { accounts },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
    )
  } catch (error) {
    console.error('Public social accounts error:', error)
    return NextResponse.json({ accounts: [] })
  }
}
