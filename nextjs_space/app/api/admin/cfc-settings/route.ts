import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'yonetici', 'moderator', 'destek', 'yardim']

const CFC_SETTINGS_KEYS = [
  'cfc_whatsapp_number',
  'cfc_papara_address',
  'cfc_bank_name',
  'cfc_bank_iban',
  'cfc_bank_account_holder',
  'cfc_tl_rate',
  'cfc_min_amount',
]

// GET - Get CFC payment settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const settings = await prisma.platformSettings.findMany({
      where: { key: { in: CFC_SETTINGS_KEYS } },
    })

    const result: Record<string, string> = {}
    settings.forEach((s: { key: string; value: string }) => {
      result[s.key] = s.value
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching CFC settings:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Update CFC payment settings (bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json()

    // Update each setting
    for (const key of CFC_SETTINGS_KEYS) {
      if (body[key] !== undefined) {
        await prisma.platformSettings.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]), description: `CFC ödeme ayarı: ${key}` },
        })
        invalidateCache(`platform:${key}`)
      }
    }

    invalidateCache('platform:__all__')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating CFC settings:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
