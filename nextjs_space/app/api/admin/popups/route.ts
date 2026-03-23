import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }
    const popups = await prisma.adminPopup.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(popups);
  } catch (error) {
    console.error('Admin popups GET error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }
    const body = await request.json();
    const { title, message, buttons, isActive, showTo, popupType, priority, maxShowCount, showOnRefresh, showDelaySeconds } = body;
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
        maxShowCount: maxShowCount !== undefined ? parseInt(maxShowCount) || 0 : 1,
        showOnRefresh: showOnRefresh !== undefined ? showOnRefresh : false,
        showDelaySeconds: showDelaySeconds !== undefined ? parseInt(showDelaySeconds) || 1 : 1,
      },
    });
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Admin popups POST error:', error);
    return NextResponse.json({ error: 'Oluşturma başarısız' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }
    const body = await request.json();
    const { id, title, message, buttons, isActive, showTo, popupType, priority, maxShowCount, showOnRefresh, showDelaySeconds, action } = body;
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Special action: resend popup (updates lastSentAt so polling clients pick it up again)
    if (action === 'resend') {
      const popup = await prisma.adminPopup.update({
        where: { id },
        data: { lastSentAt: new Date(), isActive: true },
      });
      return NextResponse.json(popup);
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
        ...(maxShowCount !== undefined && { maxShowCount: parseInt(maxShowCount) || 0 }),
        ...(showOnRefresh !== undefined && { showOnRefresh }),
        ...(showDelaySeconds !== undefined && { showDelaySeconds: parseInt(showDelaySeconds) || 1 }),
      },
    });
    return NextResponse.json(popup);
  } catch (error) {
    console.error('Admin popups PUT error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
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
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 });
  }
}
