import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Get CFC payment config from platform settings
    const whatsappNumber = await getCachedPlatformSetting('cfc_whatsapp_number', '')
    const paparaAddress = await getCachedPlatformSetting('cfc_papara_address', '')
    const bankName = await getCachedPlatformSetting('cfc_bank_name', '')
    const bankIban = await getCachedPlatformSetting('cfc_bank_iban', '')
    const bankAccountHolder = await getCachedPlatformSetting('cfc_bank_account_holder', '')
    const cfcRate = await getCachedPlatformSetting('cfc_tl_rate', '1') // 1 CFC = X TL
    const minCfcAmount = await getCachedPlatformSetting('cfc_min_amount', '10')

    return NextResponse.json({
      whatsappNumber,
      paparaAddress,
      bankName,
      bankIban,
      bankAccountHolder,
      cfcRate: parseFloat(cfcRate),
      minCfcAmount: parseInt(minCfcAmount),
    })
  } catch (error) {
    console.error('Error fetching payment config:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
