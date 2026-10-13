import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ theme: 'mystical' });
    }

    const user = await prisma.user.findUnique({
      where: { email: auth.email },
      select: { theme: true },
    });

    return NextResponse.json({ theme: user?.theme || 'mystical' });
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json({ theme: 'mystical' });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { theme } = await req.json();
    
    if (theme !== 'mystical' && theme !== 'facebook') {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: auth.email },
      data: { theme },
    });

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
  }
}
