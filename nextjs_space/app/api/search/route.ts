import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Static searchable items (pages, features, fortune types)
const STATIC_ITEMS = [
  // Fortune Types
  { type: 'fortune', id: 'coffee', titleTr: 'Kahve Falı', titleEn: 'Coffee Reading', href: '/fortunes/coffee', icon: '☕' },
  { type: 'fortune', id: 'tarot', titleTr: 'Tarot Falı', titleEn: 'Tarot Cards', href: '/fortunes/tarot', icon: '🃏' },
  { type: 'fortune', id: 'horoscope', titleTr: 'Günlük Burç Yorumu', titleEn: 'Daily Horoscope', href: '/fortunes/horoscope', icon: '⭐' },
  { type: 'fortune', id: 'love', titleTr: 'Aşk Uyumu', titleEn: 'Love Compatibility', href: '/fortunes/love', icon: '❤️' },
  { type: 'fortune', id: 'hand-reading', titleTr: 'El Falı', titleEn: 'Palm Reading', href: '/fortunes/hand-reading', icon: '✋' },
  { type: 'fortune', id: 'dream', titleTr: 'Rüya Yorumu', titleEn: 'Dream Interpretation', href: '/fortunes/dream', icon: '🌙' },
  { type: 'fortune', id: 'numerology', titleTr: 'Numeroloji', titleEn: 'Numerology', href: '/fortunes/numerology', icon: '🔢' },
  { type: 'fortune', id: 'angel', titleTr: 'Melek Kartları', titleEn: 'Angel Cards', href: '/fortunes/angel', icon: '👼' },
  { type: 'fortune', id: 'aura', titleTr: 'Aura Analizi', titleEn: 'Aura Analysis', href: '/fortunes/aura', icon: '🔮' },
  { type: 'fortune', id: 'birthchart', titleTr: 'Doğum Haritası', titleEn: 'Birth Chart', href: '/fortunes/birthchart', icon: '📊' },
  { type: 'fortune', id: 'katina', titleTr: 'Katina Falı', titleEn: 'Katina Reading', href: '/fortunes/katina', icon: '🎴' },
  { type: 'fortune', id: 'yesno', titleTr: 'Evet/Hayır', titleEn: 'Yes/No Oracle', href: '/fortunes/yesno', icon: '❓' },
  { type: 'fortune', id: 'kursundokme', titleTr: 'Kurşun Dökme', titleEn: 'Lead Pouring', href: '/fortunes/kursundokme', icon: '🫠' },
  { type: 'fortune', id: 'istikhara', titleTr: 'İstikhare', titleEn: 'Istikhara', href: '/fortunes/istikhara', icon: '🕌' },
  // Pages
  { type: 'page', id: 'games', titleTr: 'Oyun Merkezi', titleEn: 'Game Center', href: '/games', icon: '🎮' },
  { type: 'page', id: 'social', titleTr: 'Sosyal', titleEn: 'Social', href: '/social', icon: '👥' },
  { type: 'page', id: 'chat', titleTr: 'Fal Sohbet', titleEn: 'Fortune Chat', href: '/chat', icon: '💬' },
  { type: 'page', id: 'gifts', titleTr: 'Hediye Gönder', titleEn: 'Send Gift', href: '/gifts', icon: '🎁' },
  { type: 'page', id: 'live-tellers', titleTr: 'Canlı Falcılar', titleEn: 'Live Tellers', href: '/live-tellers', icon: '📹' },
  { type: 'page', id: 'dashboard', titleTr: 'İstatistikler', titleEn: 'Statistics', href: '/dashboard', icon: '📊' },
  { type: 'page', id: 'credits', titleTr: 'CFC Yükle', titleEn: 'Buy CFC', href: '/credits', icon: '💰' },
  { type: 'page', id: 'settings', titleTr: 'Ayarlar', titleEn: 'Settings', href: '/settings', icon: '⚙️' },
  { type: 'page', id: 'profile', titleTr: 'Profil', titleEn: 'Profile', href: '/profile', icon: '👤' },
  { type: 'page', id: 'memberships', titleTr: 'Üyelikler', titleEn: 'Memberships', href: '/memberships', icon: '👑' },
  { type: 'page', id: 'video', titleTr: 'Canlı Yayınlar', titleEn: 'Live Streams', href: '/chat/video', icon: '📺' },
  { type: 'page', id: 'become-teller', titleTr: 'Falcı Ol', titleEn: 'Become Teller', href: '/become-teller', icon: '🔮' },
  { type: 'page', id: 'bana-ozel', titleTr: 'Bana Özel', titleEn: 'For Me', href: '/bana-ozel', icon: '✨' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const lang = searchParams.get('lang') || 'tr';

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] });
    }

    // Search static items
    const staticResults = STATIC_ITEMS.filter((item) => {
      const title = lang === 'tr' ? item.titleTr : item.titleEn;
      return (
        title.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.titleTr.toLowerCase().includes(query) ||
        item.titleEn.toLowerCase().includes(query)
      );
    }).map((item) => ({
      type: item.type,
      id: item.id,
      title: lang === 'tr' ? item.titleTr : item.titleEn,
      href: item.href,
      icon: item.icon,
    }));

    // Search games from DB
    let gameResults: Array<{ type: string; id: string; title: string; href: string; icon: string }> = [];
    try {
      const games = await prisma.miniGame.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, slug: true, title: true, icon: true },
      });
      gameResults = games.map((g) => ({
        type: 'game',
        id: g.id,
        title: g.title,
        href: `/games/${g.slug}`,
        icon: g.icon || '🎮',
      }));
    } catch {
      // DB query failed, skip
    }

    // Search users from DB
    let userResults: Array<{ type: string; id: string; title: string; href: string; icon: string; image?: string }> = [];
    if (query.length >= 2) {
      try {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, username: true, image: true },
        });
        userResults = users.map((u) => ({
          type: 'user',
          id: u.id,
          title: u.name || u.username || 'User',
          href: `/profile/${u.id}`,
          icon: '👤',
          image: u.image || undefined,
        }));
      } catch {
        // DB query failed, skip
      }
    }

    // Combine and limit
    const results = [...staticResults, ...gameResults, ...userResults].slice(0, 15);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}
