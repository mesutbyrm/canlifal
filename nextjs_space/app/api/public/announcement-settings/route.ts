import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: { in: ['entry_announcement_enabled', 'entry_announcement_duration', 'entry_announcement_style'] }
      }
    });
    const result: Record<string, string> = {};
    settings.forEach((s: { key: string; value: string }) => { result[s.key] = s.value; });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
