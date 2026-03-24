import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Fetch all broadcast images (admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (user?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }
    
    const images = await prisma.broadcastImage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })
    
    return NextResponse.json(images)
  } catch (error) {
    console.error('Error fetching broadcast images:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}

// POST - Create a new broadcast image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (user?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }
    
    const { name, imageUrl, sortOrder } = await request.json()
    
    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'Name and imageUrl are required' }, { status: 400 })
    }
    
    const image = await prisma.broadcastImage.create({
      data: {
        name,
        imageUrl,
        sortOrder: sortOrder || 0,
        isActive: true
      }
    })
    
    return NextResponse.json(image)
  } catch (error) {
    console.error('Error creating broadcast image:', error)
    return NextResponse.json({ error: 'Failed to create image' }, { status: 500 })
  }
}

// PATCH - Update a broadcast image
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (user?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }
    
    const { id, name, imageUrl, sortOrder, isActive } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }
    
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    
    const image = await prisma.broadcastImage.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json(image)
  } catch (error) {
    console.error('Error updating broadcast image:', error)
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 })
  }
}

// DELETE - Delete a broadcast image
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (user?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }
    
    await prisma.broadcastImage.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting broadcast image:', error)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
}
