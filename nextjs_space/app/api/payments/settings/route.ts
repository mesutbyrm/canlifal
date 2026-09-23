import { NextResponse } from 'next/server';
import { getCachedPlatformSetting } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const PAYMENT_KEYS = ['whatsapp_number', 'whatsapp_message', 'whatsapp_enabled'];

// Get public payment settings (WhatsApp, etc.) - cached
export async function GET() {
  try {
    const entries = await Promise.all(
      PAYMENT_KEYS.map(async (key) => {
        const value = await getCachedPlatformSetting(key, '');
        return [key, value] as [string, string];
      })
    );
    const result: Record<string, string> = {};
    entries.forEach(([key, value]) => { if (value) result[key] = value; });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch payment settings error:', error);
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}
