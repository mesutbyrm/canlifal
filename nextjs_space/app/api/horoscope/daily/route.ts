import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const client = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1'
});

const ZODIAC_NAMES: Record<string, { tr: string; en: string; emoji: string }> = {
  aries: { tr: 'Koç', en: 'Aries', emoji: '♈' },
  taurus: { tr: 'Boğa', en: 'Taurus', emoji: '♉' },
  gemini: { tr: 'İkizler', en: 'Gemini', emoji: '♊' },
  cancer: { tr: 'Yengeç', en: 'Cancer', emoji: '♋' },
  leo: { tr: 'Aslan', en: 'Leo', emoji: '♌' },
  virgo: { tr: 'Başak', en: 'Virgo', emoji: '♍' },
  libra: { tr: 'Terazi', en: 'Libra', emoji: '♎' },
  scorpio: { tr: 'Akrep', en: 'Scorpio', emoji: '♏' },
  sagittarius: { tr: 'Yay', en: 'Sagittarius', emoji: '♐' },
  capricorn: { tr: 'Oğlak', en: 'Capricorn', emoji: '♑' },
  aquarius: { tr: 'Kova', en: 'Aquarius', emoji: '♒' },
  pisces: { tr: 'Balık', en: 'Pisces', emoji: '♓' }
};

// Get or generate daily horoscope for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'tr';

    // Get user with zodiac sign
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        zodiacSign: true,
        risingSign: true,
        lastHoroscopeDate: true,
        name: true
      }
    });

    if (!user?.zodiacSign) {
      return NextResponse.json({
        hasZodiac: false,
        message: lang === 'tr'
          ? 'Burç bilginizi görmek için doğum tarihinizi girin'
          : 'Enter your birth date to see your horoscope'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastHoroscope = user.lastHoroscopeDate ? new Date(user.lastHoroscopeDate) : null;
    lastHoroscope?.setHours(0, 0, 0, 0);

    // Check if we already have today's horoscope cached in fortune table
    const existingHoroscope = await prisma.fortune.findFirst({
      where: {
        userId: session.user.id,
        fortuneType: 'daily_horoscope',
        createdAt: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingHoroscope) {
      const zodiacInfo = ZODIAC_NAMES[user.zodiacSign];
      return NextResponse.json({
        hasZodiac: true,
        zodiacSign: user.zodiacSign,
        zodiacName: zodiacInfo?.[lang as 'tr' | 'en'] || user.zodiacSign,
        zodiacEmoji: zodiacInfo?.emoji || '✨',
        risingSign: user.risingSign,
        risingName: user.risingSign ? ZODIAC_NAMES[user.risingSign]?.[lang as 'tr' | 'en'] : null,
        horoscope: existingHoroscope.aiResponse,
        date: existingHoroscope.createdAt
      });
    }

    // Generate new horoscope using LLM
    const zodiacName = ZODIAC_NAMES[user.zodiacSign]?.[lang as 'tr' | 'en'] || user.zodiacSign;
    const risingName = user.risingSign ? ZODIAC_NAMES[user.risingSign]?.[lang as 'tr' | 'en'] : null;

    const prompt = lang === 'tr'
      ? `Sen deneyimli bir astrologsun. Bugün ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} için ${zodiacName} burcunun günlük yorumunu yaz.${risingName ? ` Kişinin yüselen burcu ${risingName}.` : ''}

Yorum şunları içersin:
- Genel enerji ve günün teması
- Aşk ve ilişkiler
- Kariyer ve finans
- Sağlık ve enerji
- Bugün için şanslı sayı ve renk

Samimi, pozitif ve motive edici bir dil kullan. 150-200 kelime arasında yaz.`
      : `You are an experienced astrologer. Write the daily horoscope for ${zodiacName} for today, ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.${risingName ? ` The person's rising sign is ${risingName}.` : ''}

Include:
- Overall energy and theme of the day
- Love and relationships
- Career and finance
- Health and energy
- Lucky number and color for today

Use a warm, positive and motivating tone. Write 150-200 words.`;

    const completion = await client.chat.completions.create({
      model: 'route-llm',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8
    });

    const horoscopeText = completion.choices[0]?.message?.content || '';

    // Save to database
    await prisma.fortune.create({
      data: {
        userId: session.user.id,
        fortuneType: 'daily_horoscope',
        inputData: `${user.zodiacSign}${user.risingSign ? `_${user.risingSign}` : ''}`,
        aiResponse: horoscopeText,
        language: lang
      }
    });

    // Update last horoscope date
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastHoroscopeDate: new Date() }
    });

    const zodiacInfo = ZODIAC_NAMES[user.zodiacSign];
    return NextResponse.json({
      hasZodiac: true,
      zodiacSign: user.zodiacSign,
      zodiacName: zodiacInfo?.[lang as 'tr' | 'en'] || user.zodiacSign,
      zodiacEmoji: zodiacInfo?.emoji || '✨',
      risingSign: user.risingSign,
      risingName: user.risingSign ? ZODIAC_NAMES[user.risingSign]?.[lang as 'tr' | 'en'] : null,
      horoscope: horoscopeText,
      date: new Date()
    });
  } catch (error) {
    console.error('Daily horoscope error:', error);
    return NextResponse.json({ error: 'Failed to get horoscope' }, { status: 500 });
  }
}
