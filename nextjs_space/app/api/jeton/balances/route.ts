import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getJetonBalances } from '@/lib/jeton-source'

export const dynamic = 'force-dynamic'

/**
 * GET /api/jeton/balances
 * Kullanıcının gerçek ve sahte (bonus) jeton bakiyelerini döner.
 * mustChooseSource = true ise istemci harcamadan önce "gerçek mi sahte mi?"
 * diye sormalı ve isteğin gövdesine jetonSource: 'real' | 'fake' eklemeli.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const balances = await getJetonBalances(authUser.id)
    return NextResponse.json({ success: true, ...balances })
  } catch (error) {
    console.error('[jeton/balances]', error)
    return NextResponse.json({ error: 'Bakiye alınamadı' }, { status: 500 })
  }
}
