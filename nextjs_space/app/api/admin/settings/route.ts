import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get all platform settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const settings = await prisma.platformSettings.findMany();
    
    // Convert to object for easier access
    const settingsObj: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      settingsObj[s.key] = s.value;
    });

    // Set defaults if not exists
    const defaults: Record<string, string> = {
      'commission_rate': '20',
      'stream_gift_commission': '30',
      'direct_gift_commission': '0',
      'jeton_transfer_commission': '0',
      'default_agency_commission': '5',
      'min_withdrawal': '100',
      'referral_bonus': '50',
      'welcome_credits': '10'
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!settingsObj[key]) {
        settingsObj[key] = value;
      }
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}

// Update platform settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 });
    }

    const setting = await prisma.platformSettings.upsert({
      where: { key },
      update: { value: String(value), description },
      create: { key, value: String(value), description }
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Update setting error:', error);
    return NextResponse.json({ error: 'Ayar güncellenemedi' }, { status: 500 });
  }
}
