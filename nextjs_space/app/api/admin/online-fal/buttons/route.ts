import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === 'admin'
}

// GET all buttons (admin)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buttons = await prisma.onlineFalButton.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ buttons })
}

// POST - create new button
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { label, icon, href, bgColor, borderColor, textColor } = body

  if (!label || !href) return NextResponse.json({ error: 'Label and href required' }, { status: 400 })

  const maxOrder = await prisma.onlineFalButton.aggregate({ _max: { sortOrder: true } })
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const button = await prisma.onlineFalButton.create({
    data: {
      label,
      icon: icon || '🔗',
      href,
      sortOrder: nextOrder,
      bgColor: bgColor || 'from-purple-600/30 to-fuchsia-600/30',
      borderColor: borderColor || 'border-purple-400/50',
      textColor: textColor || 'text-purple-200',
    },
  })
  return NextResponse.json({ button })
}

// PATCH - update button
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, label, icon, href, isVisible, sortOrder, bgColor, borderColor, textColor } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const updateData: any = {}
  if (label !== undefined) updateData.label = label
  if (icon !== undefined) updateData.icon = icon
  if (href !== undefined) updateData.href = href
  if (typeof isVisible === 'boolean') updateData.isVisible = isVisible
  if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder
  if (bgColor !== undefined) updateData.bgColor = bgColor
  if (borderColor !== undefined) updateData.borderColor = borderColor
  if (textColor !== undefined) updateData.textColor = textColor

  const button = await prisma.onlineFalButton.update({ where: { id }, data: updateData })
  return NextResponse.json({ button })
}

// DELETE - delete button
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.onlineFalButton.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
