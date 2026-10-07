import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

interface FortuneRequestTypeRecord {
  id: string
  name: string
  nameEn: string
  icon: string
  jetonCost: number
  description: string | null
  sortOrder: number
  isActive: boolean
}

// GET - List all fortune request types
export async function GET() {
  try {
    const types = await prisma.fortuneRequestType.findMany({
      orderBy: { sortOrder: 'asc' }
    })
    
    return NextResponse.json(types)
  } catch (error) {
    console.error('Error fetching fortune request types:', error)
    return NextResponse.json({ error: 'Türler alınamadı' }, { status: 500 })
  }
}

// POST - Create a new fortune request type (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    
    const { name, nameEn, icon, jetonCost, description, sortOrder } = await request.json()
    
    if (!name || !nameEn || jetonCost === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const type = await prisma.fortuneRequestType.create({
      data: {
        name,
        nameEn,
        icon: icon || '☕',
        jetonCost: Number(jetonCost),
        description: description || null,
        sortOrder: sortOrder ?? 0,
        isActive: true
      }
    })
    
    return NextResponse.json(type)
  } catch (error) {
    console.error('Error creating fortune request type:', error)
    return NextResponse.json({ error: 'Failed to create type' }, { status: 500 })
  }
}

// PATCH - Update a fortune request type (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    
    const { id, name, nameEn, icon, jetonCost, description, sortOrder, isActive } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    const updateData: Partial<FortuneRequestTypeRecord> = {}
    if (name !== undefined) updateData.name = name
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (icon !== undefined) updateData.icon = icon
    if (jetonCost !== undefined) updateData.jetonCost = Number(jetonCost)
    if (description !== undefined) updateData.description = description
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    
    const type = await prisma.fortuneRequestType.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json(type)
  } catch (error) {
    console.error('Error updating fortune request type:', error)
    return NextResponse.json({ error: 'Failed to update type' }, { status: 500 })
  }
}

// DELETE - Delete a fortune request type (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    await prisma.fortuneRequestType.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fortune request type:', error)
    return NextResponse.json({ error: 'Failed to delete type' }, { status: 500 })
  }
}
