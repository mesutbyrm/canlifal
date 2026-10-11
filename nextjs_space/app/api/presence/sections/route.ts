import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Section path patterns
const SECTION_PATTERNS: Record<string, string[]> = {
  games: ['/oyunlar', '/game'],
  fortunes: ['/tarot', '/coffee', '/rune', '/astrology', '/numerology', '/hand-reading', '/crystal', '/fortune', '/fal'],
  social: ['/sosyal'],
  chat: ['/sohbet'],
  gifts: ['/hediyeler', '/gift'],
  blog: ['/blog'],
  dreams: ['/ruya', '/dream'],
  live_tellers: ['/canli-falcilar', '/canli-oda', '/falci-sohbet'],
  live_streams: ['/sohbet/video'],
  bana_ozel: ['/bana-ozel'],
};

function classifyPath(path: string | null): string | null {
  if (!path) return null;
  const lowerPath = path.toLowerCase();
  for (const [section, patterns] of Object.entries(SECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerPath.includes(pattern)) return section;
    }
  }
  return null;
}

export async function GET() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const activePresences = await prisma.sitePresence.findMany({
      where: { lastSeen: { gte: twoMinutesAgo } },
      select: { path: true },
    });

    const counts: Record<string, number> = {
      games: 0,
      fortunes: 0,
      social: 0,
      chat: 0,
      gifts: 0,
      blog: 0,
      dreams: 0,
      live_tellers: 0,
      live_streams: 0,
      bana_ozel: 0,
    };

    for (const presence of activePresences) {
      const section = classifyPath(presence.path);
      if (section && section in counts) {
        counts[section]++;
      }
    }

    return NextResponse.json({ counts, total: activePresences.length });
  } catch (error) {
    console.error('Section presence error:', error);
    return NextResponse.json({ counts: { games: 0, fortunes: 0, social: 0, chat: 0, gifts: 0, blog: 0, dreams: 0, live_tellers: 0, live_streams: 0, bana_ozel: 0 }, total: 0 });
  }
}
