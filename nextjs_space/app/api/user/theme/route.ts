import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ theme: 'mystical' });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { theme } = await req.json();
    
    if (theme !== 'mystical' && theme !== 'facebook') {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { theme },
    });

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
  }
}
