import { NextResponse } from 'next/server';
import { getCachedPlatformSetting, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Public endpoint to get theme settings (no auth required) - cached
export async function GET() {
  try {
    const [defaultTheme, enabledThemesRaw, colorMode] = await Promise.all([
      getCachedPlatformSetting('default_theme', 'falclub'),
      getCachedPlatformSetting('enabled_themes', JSON.stringify(['mystical', 'cosmic', 'facebook', 'falci', 'falclub', 'canlidark'])),
      getCachedPlatformSetting('color_mode', 'dark'),
    ]);

    let enabled_themes = ['mystical', 'cosmic', 'facebook', 'falci', 'falclub', 'canlidark'];
    try {
      const parsed = JSON.parse(enabledThemesRaw);
      if (Array.isArray(parsed)) enabled_themes = parsed;
    } catch {}

    return NextResponse.json({
      default_theme: defaultTheme,
      enabled_themes,
      color_mode: colorMode === 'light' ? 'light' : 'dark',
    });
  } catch (error) {
    console.error('Fetch theme settings error:', error);
    return NextResponse.json(
      { default_theme: 'falclub', enabled_themes: ['mystical', 'cosmic', 'facebook', 'falci', 'falclub', 'canlidark'], color_mode: 'dark' }
    );
  }
}
