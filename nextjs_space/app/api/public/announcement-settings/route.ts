import { NextResponse } from 'next/server';
import { getCachedPlatformSetting } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENT_KEYS = [
  'entry_announcement_enabled', 'entry_announcement_duration', 'entry_announcement_style',
  'entry_announcement_display_mode', 'entry_announcement_box_padding',
  'chat_marquee_effect', 'chat_marquee_speed', 'chat_marquee_repeat', 'chat_marquee_enabled',
  'event_announcement_templates',
  'announcement_bg_image', 'announcement_icon_image',
  'announcement_page_placements'
];

export async function GET() {
  try {
    const entries = await Promise.all(
      ANNOUNCEMENT_KEYS.map(async (key) => {
        const value = await getCachedPlatformSetting(key, '');
        return [key, value] as [string, string];
      })
    );
    const result: Record<string, string> = {};
    entries.forEach(([key, value]) => { if (value) result[key] = value; });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
