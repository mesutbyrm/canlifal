import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === 'admin'
}

// GET all sections (admin)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  const sections = await prisma.onlineFalSection.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ sections })
}

// PATCH - update section visibility/order
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  const body = await req.json()
  const { id, isVisible, sortOrder, title, icon } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const updateData: any = {}
  if (typeof isVisible === 'boolean') updateData.isVisible = isVisible
  if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder
  if (title) updateData.title = title
  if (icon) updateData.icon = icon

  const section = await prisma.onlineFalSection.update({
    where: { id },
    data: updateData,
  })
  return NextResponse.json({ section })
}

// POST - batch reorder sections
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  const body = await req.json()
  const { order } = body // array of { id, sortOrder }

  if (!Array.isArray(order)) return NextResponse.json({ error: 'Order array required' }, { status: 400 })

  for (const item of order) {
    await prisma.onlineFalSection.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder },
    })
  }

  const sections = await prisma.onlineFalSection.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ sections })
}
