import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.payment.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const methods = await prisma.paymentMethod.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(methods)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.payment.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, nameEn, description, descriptionEn, isActive, config, sortOrder } = body

    const method = await prisma.paymentMethod.upsert({
      where: { type },
      update: {
        name,
        nameEn,
        description,
        descriptionEn,
        isActive,
        config,
        sortOrder
      },
      create: {
        type,
        name,
        nameEn,
        description,
        descriptionEn,
        isActive,
        config,
        sortOrder
      }
    })

    invalidateCache('payments:methods')
    return NextResponse.json(method)
  } catch (error) {
    console.error('Error saving payment method:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
