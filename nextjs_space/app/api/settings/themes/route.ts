import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public endpoint to get theme settings (no auth required)
export async function GET() {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          in: ['default_theme', 'enabled_themes', 'color_mode']
        }
      }
    });

    const result: { default_theme: string; enabled_themes: string[]; color_mode: string } = {
      default_theme: 'falclub',
      enabled_themes: ['mystical', 'cosmic', 'facebook', 'falci', 'falclub'],
      color_mode: 'dark'
    };

    settings.forEach((s: { key: string; value: string }) => {
      if (s.key === 'default_theme') {
        result.default_theme = s.value;
      } else if (s.key === 'enabled_themes') {
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) {
            result.enabled_themes = parsed;
          }
        } catch {
          // Keep default enabled themes
        }
      } else if (s.key === 'color_mode') {
        if (s.value === 'light' || s.value === 'dark') {
          result.color_mode = s.value;
        }
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch theme settings error:', error);
    return NextResponse.json(
      { default_theme: 'falclub', enabled_themes: ['mystical', 'cosmic', 'facebook', 'falci', 'falclub'], color_mode: 'dark' }
    );
  }
}
