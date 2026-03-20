import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === 'admin'
}

// GET all buttons (admin - includes hidden)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buttons = await prisma.homepageButton.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ buttons })
}

// POST - create new button
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { label, icon, href, specialBehavior } = body

  if (!label || !href) return NextResponse.json({ error: 'Label and href required' }, { status: 400 })

  // Generate unique key
  const key = 'custom_' + Date.now()
  const maxOrder = await prisma.homepageButton.aggregate({ _max: { sortOrder: true } })
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const button = await prisma.homepageButton.create({
    data: {
      key,
      label,
      icon: icon || '\ud83d\udd17',
      href,
      sortOrder: nextOrder,
      specialBehavior: specialBehavior || null,
    },
  })
  return NextResponse.json({ button })
}

// PATCH - update button
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  // Batch reorder
  if (body.reorder && Array.isArray(body.reorder)) {
    for (const item of body.reorder) {
      await prisma.homepageButton.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    }
    const buttons = await prisma.homepageButton.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ buttons })
  }

  const { id, label, icon, href, isVisible, sortOrder, specialBehavior } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const updateData: any = {}
  if (label !== undefined) updateData.label = label
  if (icon !== undefined) updateData.icon = icon
  if (href !== undefined) updateData.href = href
  if (typeof isVisible === 'boolean') updateData.isVisible = isVisible
  if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder
  if (specialBehavior !== undefined) updateData.specialBehavior = specialBehavior || null

  const button = await prisma.homepageButton.update({ where: { id }, data: updateData })
  return NextResponse.json({ button })
}

// DELETE - delete button
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.homepageButton.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
