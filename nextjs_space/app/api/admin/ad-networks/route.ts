import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const networks = await prisma.adNetwork.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(networks)
  } catch (error) {
    console.error('Get ad networks error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, provider, adCode, adUnitId, appId, isActive, sortOrder } = body

    if (!name || !provider) {
      return NextResponse.json({ error: 'Name and provider are required' }, { status: 400 })
    }

    const network = await prisma.adNetwork.upsert({
      where: { provider },
      create: {
        name,
        provider,
        adCode: adCode || null,
        adUnitId: adUnitId || null,
        appId: appId || null,
        isActive: isActive ?? false,
        sortOrder: sortOrder ?? 0,
      },
      update: {
        name,
        adCode: adCode || null,
        adUnitId: adUnitId || null,
        appId: appId || null,
        isActive: isActive ?? false,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json(network)
  } catch (error) {
    console.error('Save ad network error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    await prisma.adNetwork.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete ad network error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
