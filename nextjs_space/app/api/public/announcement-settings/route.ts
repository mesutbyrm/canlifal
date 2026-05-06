import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: { in: [
          'entry_announcement_enabled', 'entry_announcement_duration', 'entry_announcement_style',
          'entry_announcement_display_mode', 'entry_announcement_box_padding',
          'chat_marquee_effect', 'chat_marquee_speed', 'chat_marquee_repeat', 'chat_marquee_enabled',
          'event_announcement_templates'
        ] }
      }
    });
    const result: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => { result[s.key] = s.value; });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
