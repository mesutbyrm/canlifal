import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const popups = await prisma.adminPopup.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(popups);
  } catch (error) {
    console.error('Admin popups GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { title, message, buttons, isActive, showTo, popupType, priority } = body;
    if (!title || !message) {
      return NextResponse.json({ error: 'title and message required' }, { status: 400 });
    }
    const popup = await prisma.adminPopup.create({
      data: {
        title,
        message,
        buttons: typeof buttons === 'string' ? buttons : JSON.stringify(buttons || []),
        isActive: isActive !== undefined ? isActive : true,
        showTo: showTo || 'all',
        popupType: popupType || 'custom',
        priority: priority || 0,
      },
    });
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Admin popups POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, title, message, buttons, isActive, showTo, popupType, priority } = body;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const popup = await prisma.adminPopup.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(buttons !== undefined && { buttons: typeof buttons === 'string' ? buttons : JSON.stringify(buttons) }),
        ...(isActive !== undefined && { isActive }),
        ...(showTo !== undefined && { showTo }),
        ...(popupType !== undefined && { popupType }),
        ...(priority !== undefined && { priority }),
      },
    });
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Admin popups PUT error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    await prisma.adminPopup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin popups DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
