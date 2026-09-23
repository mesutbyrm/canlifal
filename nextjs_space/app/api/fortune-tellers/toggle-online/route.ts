import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic';

// POST - Toggle online status for the authenticated teller
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    // Find the teller profile for this user
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
    });

    if (!teller) {
      return NextResponse.json({ error: 'Not a fortune teller' }, { status: 404 });
    }

    // Check if teller is approved and not banned
    if (teller.applicationStatus !== 'approved') {
      return NextResponse.json({ error: 'Application not approved' }, { status: 403 });
    }

    if (teller.isBanned) {
      return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const newStatus = body.isOnline !== undefined ? body.isOnline : !teller.isOnline;

    // Toggle the online status
    const updatedTeller = await prisma.liveFortuneTeller.update({
      where: { id: teller.id },
      data: { isOnline: newStatus },
    });

    return NextResponse.json({ 
      isOnline: updatedTeller.isOnline,
      message: updatedTeller.isOnline ? 'Now online' : 'Now offline'
    });
  } catch (error) {
    console.error('Error toggling online status:', error);
    return NextResponse.json({ error: 'Failed to toggle status' }, { status: 500 });
  }
}

// GET - Get current online status
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
      select: {
        id: true,
        isOnline: true,
        applicationStatus: true,
        isBanned: true,
        displayName: true,
      },
    });

    if (!teller) {
      return NextResponse.json({ isTeller: false });
    }

    return NextResponse.json({
      isTeller: true,
      ...teller,
    });
  } catch (error) {
    console.error('Error getting online status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
