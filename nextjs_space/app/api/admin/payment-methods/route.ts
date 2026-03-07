import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json(method)
  } catch (error) {
    console.error('Error saving payment method:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
