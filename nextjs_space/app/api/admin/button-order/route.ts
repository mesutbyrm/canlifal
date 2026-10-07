import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { invalidateCachePrefix } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'homepage_button_order';
const DEFAULT_ORDER = ['games', 'gifts', 'teller', 'social', 'chat', 'bana-ozel'];

// Get button order (public)
export async function GET() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: SETTING_KEY },
    });

    if (setting) {
      try {
        const order = JSON.parse(setting.value);
        return NextResponse.json({ order });
      } catch {
        return NextResponse.json({ order: DEFAULT_ORDER });
      }
    }

    return NextResponse.json({ order: DEFAULT_ORDER });
  } catch (error) {
    console.error('Fetch button order error:', error);
    return NextResponse.json({ order: DEFAULT_ORDER });
  }
}

// Update button order (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request);
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'Valid order array required' }, { status: 400 });
    }

    await prisma.platformSettings.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(order) },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(order),
        description: 'Homepage action buttons display order',
      },
    });
    invalidateCachePrefix('platform:');

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Update button order error:', error);
    return NextResponse.json({ error: 'Buton sırası güncellenemedi' }, { status: 500 });
  }
}
