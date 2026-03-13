import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get public payment settings (WhatsApp, etc.)
export async function GET() {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          in: ['whatsapp_number', 'whatsapp_message', 'whatsapp_enabled']
        }
      }
    });

    const result: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => {
      result[s.key] = s.value;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch payment settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
